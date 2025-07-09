import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { TransactionWithMetrics, TransactionItem, ASIN, GeneralLedgerTransaction } from '../types/database';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateASINExportCSV } from '../utils/asinHelpers';
import { createGeneralLedgerTransaction, createSupplier, getSuppliers } from './database';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// --- TYPE DEFINITIONS ---

interface TransactionItemWithDetails extends TransactionItem {
  asin_details?: ASIN;
  totalCost: number;
  estimatedProfit: number;
  roi: number;
  displayQuantity: number;
}

interface TransactionForReport extends TransactionWithMetrics {
  items: TransactionItemWithDetails[];
  receiptFiles: string[];
}

interface GeneralLedgerForReport extends GeneralLedgerTransaction {
  receiptFiles: string[];
}

// --- ENTRY POINT FUNCTION ---

export const generateExpenseReportBackup = async (): Promise<void> => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const zipFilename = `expense-backup-${currentDate}.zip`;

    const [transactions, transactionItems, generalLedgerTransactions, receipts, asins] = await Promise.all([
      getTransactionsForReport(),
      getTransactionItemsForReport(),
      getGeneralLedgerForReport(),
      getAllUserReceipts(),
      getAllUserASINs()
    ]);

    const transactionsWithItems = combineTransactionData(transactions, transactionItems, receipts);
    const generalLedgerWithReceipts = combineGeneralLedgerData(generalLedgerTransactions, receipts);

    const orderLogPDF = await generateOrderLogPDF(transactionsWithItems);
    const generalLogPDF = await generateGeneralLogPDF(generalLedgerWithReceipts);
    const transactionCSV = generateTransactionBackupCSV(transactionsWithItems);
    const generalLedgerCSV = generateGeneralLedgerBackupCSV(generalLedgerWithReceipts);
    const asinCSV = generateASINExportCSV(asins);

    const zipBlob = await createZipFile(
      orderLogPDF,
      generalLogPDF,
      receipts,
      currentDate,
      transactionsWithItems,
      generalLedgerWithReceipts,
      transactionCSV,
      generalLedgerCSV,
      asinCSV
    );

    downloadBlob(zipBlob, zipFilename);

  } catch (error) {
    console.error('Error generating expense report backup:', error);
    throw new Error('Failed to generate expense report backup');
  }
};

// --- IMPORT FUNCTIONALITY ---

export const importExpenseBackup = async (zipFile: File): Promise<{
  success: boolean;
  message: string;
  details: {
    transactionsImported: number;
    generalLedgerImported: number;
    receiptsRestored: number;
    errors: string[];
  };
}> => {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    
    const details = {
      transactionsImported: 0,
      generalLedgerImported: 0,
      receiptsRestored: 0,
      errors: [] as string[]
    };

    // Process CSV backups
    const csvBackupsFolder = zipContent.folder('CSV Backups') || zipContent.folder('csv backups');
    if (csvBackupsFolder) {
      // Import transaction backup
      const txnBackupFile = Object.keys(csvBackupsFolder.files).find(name => 
        name.includes('txn-backup') && name.endsWith('.csv')
      );
      
      if (txnBackupFile) {
        try {
          const csvContent = await csvBackupsFolder.files[txnBackupFile].async('text');
          const importResult = await importTransactionCSV(csvContent);
          details.transactionsImported = importResult.imported;
          details.errors.push(...importResult.errors);
        } catch (err) {
          details.errors.push(`Failed to import transaction backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Import general ledger backup
      const generalBackupFile = Object.keys(csvBackupsFolder.files).find(name => 
        name.includes('general-backup') && name.endsWith('.csv')
      );
      
      if (generalBackupFile) {
        try {
          const csvContent = await csvBackupsFolder.files[generalBackupFile].async('text');
          const importResult = await importGeneralLedgerCSV(csvContent);
          details.generalLedgerImported = importResult.imported;
          details.errors.push(...importResult.errors);
        } catch (err) {
          details.errors.push(`Failed to import general ledger backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    // Process receipts
    const orderLogFolder = zipContent.folder('Order Log');
    const generalLogFolder = zipContent.folder('General Log');
    
    let receiptsRestored = 0;
    
    // Restore Order Log receipts
    if (orderLogFolder) {
      receiptsRestored += await restoreReceiptsFromFolder(orderLogFolder, 'order');
    }
    
    // Restore General Log receipts
    if (generalLogFolder) {
      receiptsRestored += await restoreReceiptsFromFolder(generalLogFolder, 'general');
    }
    
    details.receiptsRestored = receiptsRestored;

    const totalImported = details.transactionsImported + details.generalLedgerImported;
    const message = `Successfully imported ${totalImported} transactions and restored ${receiptsRestored} receipts.${details.errors.length > 0 ? ` ${details.errors.length} errors occurred.` : ''}`;

    return {
      success: true,
      message,
      details
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        transactionsImported: 0,
        generalLedgerImported: 0,
        receiptsRestored: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
};

// --- DATA FETCHING & COMBINING ---

const getTransactionsForReport = async (): Promise<TransactionWithMetrics[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, supplier:suppliers(*)')
    .eq('user_id', user.id)
    .order('ordered_date', { ascending: true });

  if (error) throw error;

  return transactions.map(transaction => ({
    ...transaction,
    totalCost: 0,
    estimatedProfit: 0,
    roi: 0
  }));
};

const getGeneralLedgerForReport = async (): Promise<GeneralLedgerTransaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: transactions, error } = await supabase
    .from('general_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (error) throw error;
  return transactions || [];
};

const getTransactionItemsForReport = async (): Promise<TransactionItemWithDetails[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: transactionItems, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (itemsError) throw itemsError;
  if (!transactionItems?.length) return [];

  const { data: asins, error: asinsError } = await supabase
    .from('asins')
    .select('*')
    .eq('user_id', user.id);

  if (asinsError) throw asinsError;

  const asinMap = new Map<string, ASIN>(asins?.map(asin => [asin.asin, asin]) || []);

  return transactionItems.map(item => {
    const asinDetails = asinMap.get(item.asin);
    const totalCost = item.buy_price * item.quantity;
    const totalRevenue = item.sell_price * item.quantity;
    const estimatedProfit = totalRevenue - totalCost - (item.est_fees * item.quantity);
    const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;
    const displayQuantity = asinDetails?.type === 'Bundle' && asinDetails.pack > 1
      ? Math.floor(item.quantity / asinDetails.pack)
      : item.quantity;

    return {
      ...item,
      asin_details: asinDetails,
      totalCost,
      estimatedProfit,
      roi,
      displayQuantity
    };
  });
};

const getAllUserReceipts = async (): Promise<{ name: string; blob: Blob; transactionId: string; type: 'order' | 'general' }[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { data: files, error } = await supabase.storage
      .from('receipts')
      .list(user.id);

    if (error) throw error;
    if (!files || files.length === 0) return [];

    const downloadPromises = files.map(async (file) => {
      try {
        const filePath = `${user.id}/${file.name}`;
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('receipts')
          .download(filePath);

        if (downloadError) {
          console.warn(`Failed to download receipt ${file.name}:`, downloadError);
          return null;
        }
        
        // Extract transaction ID and determine type
        const transactionId = file.name.split('-')[0].split('.')[0];
        const type: 'order' | 'general' = file.name.startsWith('GL-') ? 'general' : 'order';
        
        return fileData ? { 
          name: file.name, 
          blob: fileData, 
          transactionId,
          type
        } : null;
      } catch (err) {
        console.warn(`Error processing receipt ${file.name}:`, err);
        return null;
      }
    });

    const receipts = await Promise.all(downloadPromises);
    return receipts.filter((receipt): receipt is { name: string; blob: Blob; transactionId: string; type: 'order' | 'general' } => receipt !== null);

  } catch (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }
};

const getAllUserASINs = async (): Promise<ASIN[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: asins, error } = await supabase
    .from('asins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return asins || [];
};

const combineTransactionData = (
  transactions: TransactionWithMetrics[],
  transactionItems: TransactionItemWithDetails[],
  receipts: { name: string; blob: Blob; transactionId: string; type: 'order' | 'general' }[]
): TransactionForReport[] => {
  return transactions.map(transaction => {
    const items = transactionItems.filter(item => item.transaction_id === transaction.id);
    const itemsCostOfGoods = items.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
    const totalFees = items.reduce((sum, item) => sum + ((item.est_fees || 0) * item.quantity), 0);
    const totalCost = itemsCostOfGoods + transaction.shipping_cost;
    const totalRevenue = items.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
    const estimatedProfit = totalRevenue - totalCost - totalFees;
    const roi = itemsCostOfGoods > 0 ? (estimatedProfit / itemsCostOfGoods) * 100 : 0;
    
    // Find receipts for this transaction and generate new naming convention
    const transactionReceipts = receipts
      .filter(receipt => receipt.transactionId === transaction.id && receipt.type === 'order')
      .map((receipt, index) => {
        const extension = receipt.name.split('.').pop() || 'jpg';
        return `${transaction.id.slice(0, 8).toUpperCase()}-${(index + 1).toString().padStart(3, '0')}.${extension}`;
      });

    return {
      ...transaction,
      totalCost,
      estimatedProfit,
      roi,
      items,
      receiptFiles: transactionReceipts
    };
  });
};

const combineGeneralLedgerData = (
  transactions: GeneralLedgerTransaction[],
  receipts: { name: string; blob: Blob; transactionId: string; type: 'order' | 'general' }[]
): GeneralLedgerForReport[] => {
  return transactions.map(transaction => {
    // Find receipts for this transaction and generate new naming convention
    const transactionReceipts = receipts
      .filter(receipt => receipt.transactionId === transaction.id && receipt.type === 'general')
      .map((receipt, index) => {
        const extension = receipt.name.split('.').pop() || 'jpg';
        const shortId = transaction.reference?.startsWith('GL-') 
          ? transaction.reference.slice(0, 8).toUpperCase()
          : transaction.id.slice(0, 8).toUpperCase();
        return `${shortId}-${(index + 1).toString().padStart(3, '0')}.${extension}`;
      });

    return {
      ...transaction,
      receiptFiles: transactionReceipts
    };
  });
};

// --- CSV GENERATION ---

const generateTransactionBackupCSV = (transactions: TransactionForReport[]): string => {
  const headers = [
    'TXN ID',
    'Ordered Date',
    'Delivery Date', 
    'Supplier Name',
    'PO Number',
    'Category',
    'Payment Method',
    'Status',
    'Shipping Cost',
    'Notes',
    'ASIN',
    'Quantity',
    'Buy Price',
    'Sell Price',
    'Est Fees'
  ];

  let csvContent = headers.join(',') + '\n';

  transactions.forEach(transaction => {
    if (transaction.items.length === 0) {
      const row = [
        transaction.id,
        formatDateForCSV(transaction.ordered_date),
        formatDateForCSV(transaction.delivery_date),
        transaction.supplier?.name || '',
        transaction.po_number || '',
        transaction.category || '',
        transaction.payment_method || '',
        transaction.status || '',
        transaction.shipping_cost.toString(),
        transaction.notes || '',
        '', '', '', '', ''
      ];
      csvContent += escapeCSVRow(row) + '\n';
    } else {
      transaction.items.forEach((item, index) => {
        const row = [
          transaction.id,
          formatDateForCSV(transaction.ordered_date),
          formatDateForCSV(transaction.delivery_date),
          transaction.supplier?.name || '',
          transaction.po_number || '',
          transaction.category || '',
          transaction.payment_method || '',
          transaction.status || '',
          index === 0 ? transaction.shipping_cost.toString() : '0',
          transaction.notes || '',
          item.asin,
          item.quantity.toString(),
          item.buy_price.toString(),
          item.sell_price.toString(),
          (item.est_fees || 0).toString()
        ];
        csvContent += escapeCSVRow(row) + '\n';
      });
    }
  });

  return csvContent;
};

const generateGeneralLedgerBackupCSV = (transactions: GeneralLedgerForReport[]): string => {
  const headers = [
    'TXN ID',
    'Date',
    'Category',
    'Reference',
    'Type',
    'Amount',
    'Payment Method',
    'Status',
    'Director Name'
  ];

  let csvContent = headers.join(',') + '\n';

  transactions.forEach(transaction => {
    const row = [
      transaction.id,
      formatDateForCSV(transaction.date),
      transaction.category,
      transaction.reference || '',
      transaction.type,
      transaction.amount.toString(),
      transaction.payment_method || '',
      transaction.status || '',
      transaction.director_name || ''
    ];
    csvContent += escapeCSVRow(row) + '\n';
  });

  return csvContent;
};

const formatDateForCSV = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

const escapeCSVRow = (row: string[]): string => {
  return row.map(field => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }).join(',');
};

// --- PDF GENERATION ---

const generateOrderLogPDF = async (transactions: TransactionForReport[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
  });

  const MARGIN = 10;
  let yPosition = MARGIN;

  const totalSpend = transactions.reduce((sum, t) => sum + t.totalCost, 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.estimatedProfit, 0);
  const totalROI = transactions.length > 0
    ? transactions.reduce((sum, t) => sum + t.roi, 0) / transactions.length
    : 0;

  // Title
  doc.setFillColor('#3b82f6');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Purchase Order Log Report', MARGIN + 10, yPosition + 35);
  
  yPosition += 50;

  // Summary
  doc.autoTable({
    startY: yPosition,
    head: [['Generated:', 'Total Orders:', 'Total Spend:', 'Total Est. Profit:', 'Avg ROI:']],
    body: [[
      formatDate(new Date().toISOString()),
      String(transactions.length),
      formatCurrency(totalSpend),
      formatCurrency(totalProfit),
      `${totalROI.toFixed(1)}%`
    ]],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fontStyle: 'normal', textColor: [0, 0, 0], fillColor: [255, 255, 255] },
    bodyStyles: { fontStyle: 'bold' },
    margin: { left: MARGIN, right: MARGIN },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Transactions
  transactions.forEach((transaction) => {
    if (yPosition > doc.internal.pageSize.getHeight() - 200) {
      doc.addPage();
      yPosition = MARGIN;
    }

    // Transaction header
    doc.autoTable({
      startY: yPosition,
      head: [['TXN ID', 'ORDERED DATE', 'DELIVERY DATE', 'SUPPLIER', 'CATEGORY', 'PAYMENT METHOD', 'TOTAL COST', 'ROI']],
      body: [[
        transaction.id.slice(0, 8).toUpperCase(),
        formatDate(transaction.ordered_date),
        formatDate(transaction.delivery_date),
        transaction.supplier?.name || 'N/A',
        transaction.category || 'N/A',
        transaction.payment_method || 'N/A',
        formatCurrency(transaction.totalCost),
        `${transaction.roi.toFixed(0)}%`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      margin: { left: MARGIN, right: MARGIN },
    });

    yPosition = doc.lastAutoTable.finalY + 5;

    // Items
    if (transaction.items.length > 0) {
      const itemsData = transaction.items.map(item => [
        item.asin_details?.title || 'No Title',
        item.asin_details?.category || 'Other',
        item.asin,
        item.quantity.toString(),
        formatCurrency(item.buy_price),
        formatCurrency(item.totalCost)
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['TITLE', 'CATEGORY', 'ASIN', 'QTY', 'COG', 'TOTAL']],
        body: itemsData,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        margin: { left: MARGIN, right: MARGIN },
      });

      yPosition = doc.lastAutoTable.finalY + 5;
    }

    // Receipts
    if (transaction.receiptFiles.length > 0) {
      doc.autoTable({
        startY: yPosition,
        head: [['Associated Receipts']],
        body: [['']],
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [100, 116, 139], fontSize: 9, fontStyle: 'bold', cellPadding: 5 },
        bodyStyles: { fillColor: [255, 255, 255], cellPadding: 0, minCellHeight: 0 },
        margin: { left: MARGIN, right: MARGIN }
      });
      
      yPosition = doc.lastAutoTable.finalY;
      
      const receiptText = transaction.receiptFiles.join(' — ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#1e293b');
      doc.text(receiptText, MARGIN + 15, yPosition + 15, { 
        maxWidth: doc.internal.pageSize.getWidth() - (MARGIN * 2) - 30 
      });

      const textLines = doc.splitTextToSize(receiptText, doc.internal.pageSize.getWidth() - (MARGIN * 2) - 30);
      yPosition += 15 + (textLines.length * 10);
    }

    yPosition += 15;
  });
  
  return doc.output('blob');
};

const generateGeneralLogPDF = async (transactions: GeneralLedgerForReport[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
  });

  const MARGIN = 10;
  let yPosition = MARGIN;

  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netAmount = totalIncome - totalExpenses;

  // Title
  doc.setFillColor('#10b981');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('General Ledger Report', MARGIN + 10, yPosition + 35);
  
  yPosition += 50;

  // Summary
  doc.autoTable({
    startY: yPosition,
    head: [['Generated:', 'Total Transactions:', 'Total Income:', 'Total Expenses:', 'Net Amount:']],
    body: [[
      formatDate(new Date().toISOString()),
      String(transactions.length),
      formatCurrency(totalIncome),
      formatCurrency(totalExpenses),
      formatCurrency(netAmount)
    ]],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fontStyle: 'normal', textColor: [0, 0, 0], fillColor: [255, 255, 255] },
    bodyStyles: { fontStyle: 'bold' },
    margin: { left: MARGIN, right: MARGIN },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Transactions table
  const transactionData = transactions.map(transaction => [
    transaction.reference?.startsWith('GL-') 
      ? transaction.reference.slice(0, 8).toUpperCase()
      : transaction.id.slice(0, 8).toUpperCase(),
    formatDate(transaction.date),
    transaction.category,
    transaction.reference || '',
    transaction.type,
    formatCurrency(Math.abs(transaction.amount)),
    transaction.payment_method || '',
    transaction.status || ''
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['TXN ID', 'DATE', 'CATEGORY', 'REFERENCE', 'TYPE', 'AMOUNT', 'PAYMENT', 'STATUS']],
    body: transactionData,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    margin: { left: MARGIN, right: MARGIN },
  });
  
  return doc.output('blob');
};

// --- ZIP CREATION ---

const createZipFile = async (
  orderLogPDF: Blob,
  generalLogPDF: Blob,
  receipts: { name: string; blob: Blob; transactionId: string; type: 'order' | 'general' }[],
  currentDate: string,
  transactions: TransactionForReport[],
  generalLedgerTransactions: GeneralLedgerForReport[],
  transactionCSV: string,
  generalLedgerCSV: string,
  asinCSV: string
): Promise<Blob> => {
  const zip = new JSZip();
  
  // Create main folders
  const orderLogFolder = zip.folder('Order Log');
  const generalLogFolder = zip.folder('General Log');
  const csvBackupsFolder = zip.folder('CSV Backups');

  // Add PDFs to respective folders
  if (orderLogFolder) {
    orderLogFolder.file(`order-log-report-${currentDate}.pdf`, orderLogPDF);
  }
  
  if (generalLogFolder) {
    generalLogFolder.file(`general-log-report-${currentDate}.pdf`, generalLogPDF);
  }

  // Add CSV backups
  if (csvBackupsFolder) {
    csvBackupsFolder.file(`txn-backup-${currentDate}.csv`, transactionCSV);
    csvBackupsFolder.file(`general-backup-${currentDate}.csv`, generalLedgerCSV);
    csvBackupsFolder.file(`asin-backup-${currentDate}.csv`, asinCSV);
  }

  // Create transaction ID maps for folder names
  const orderTransactionMap = new Map<string, string>();
  transactions.forEach(transaction => {
    const shortId = transaction.id.slice(0, 8).toUpperCase();
    orderTransactionMap.set(transaction.id, shortId);
  });

  const generalTransactionMap = new Map<string, string>();
  generalLedgerTransactions.forEach(transaction => {
    const shortId = transaction.reference?.startsWith('GL-') 
      ? transaction.reference.slice(0, 8).toUpperCase()
      : transaction.id.slice(0, 8).toUpperCase();
    generalTransactionMap.set(transaction.id, shortId);
  });

  // Group receipts by transaction and type
  const orderReceiptsByTransaction = new Map<string, { name: string; blob: Blob }[]>();
  const generalReceiptsByTransaction = new Map<string, { name: string; blob: Blob }[]>();
  
  receipts.forEach(receipt => {
    const targetMap = receipt.type === 'order' ? orderReceiptsByTransaction : generalReceiptsByTransaction;
    
    if (!targetMap.has(receipt.transactionId)) {
      targetMap.set(receipt.transactionId, []);
    }
    targetMap.get(receipt.transactionId)!.push({
      name: receipt.name,
      blob: receipt.blob
    });
  });

  // Add Order Log receipts
  if (orderLogFolder) {
    for (const [transactionId, transactionReceipts] of orderReceiptsByTransaction) {
      const shortId = orderTransactionMap.get(transactionId) || transactionId.slice(0, 8).toUpperCase();
      const transactionFolder = orderLogFolder.folder(shortId);
      
      if (transactionFolder) {
        transactionReceipts.forEach((receipt, index) => {
          const extension = receipt.name.split('.').pop() || 'jpg';
          const newName = `${shortId}-${(index + 1).toString().padStart(3, '0')}.${extension}`;
          transactionFolder.file(newName, receipt.blob);
        });
      }
    }
  }

  // Add General Log receipts
  if (generalLogFolder) {
    for (const [transactionId, transactionReceipts] of generalReceiptsByTransaction) {
      const shortId = generalTransactionMap.get(transactionId) || transactionId.slice(0, 8).toUpperCase();
      const transactionFolder = generalLogFolder.folder(shortId);
      
      if (transactionFolder) {
        transactionReceipts.forEach((receipt, index) => {
          const extension = receipt.name.split('.').pop() || 'jpg';
          const newName = `${shortId}-${(index + 1).toString().padStart(3, '0')}.${extension}`;
          transactionFolder.file(newName, receipt.blob);
        });
      }
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
};

// --- IMPORT HELPERS ---

const restoreReceiptsFromFolder = async (
  folder: JSZip,
  type: 'order' | 'general'
): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let restored = 0;
  
  // Process each transaction folder
  for (const [path, file] of Object.entries(folder.files)) {
    if (file.dir) continue; // Skip directories
    
    try {
      const pathParts = path.split('/');
      if (pathParts.length < 2) continue;
      
      const transactionFolder = pathParts[pathParts.length - 2];
      const fileName = pathParts[pathParts.length - 1];
      
      // Extract transaction ID from folder name
      const transactionId = transactionFolder;
      
      // Generate new filename with transaction ID prefix
      const extension = fileName.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const newFileName = `${transactionId}-${timestamp}.${extension}`;
      const filePath = `${user.id}/${newFileName}`;
      
      // Download file content
      const fileBlob = await file.async('blob');
      
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, fileBlob);
      
      if (!error) {
        restored++;
      } else {
        console.warn(`Failed to restore receipt ${fileName}:`, error);
      }
      
    } catch (err) {
      console.warn(`Error restoring receipt from ${path}:`, err);
    }
  }
  
  return restored;
};

// Helper function to parse CSV line
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

const importTransactionCSV = async (csvContent: string): Promise<{ imported: number; errors: string[] }> => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { imported: 0, errors };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
  
  // Map headers to expected field names
  const headerMap: { [key: string]: string } = {
    'txn id': 'txn_id',
    'ordered date': 'ordered_date',
    'delivery date': 'delivery_date',
    'supplier name': 'supplier_name',
    'po number': 'po_number',
    'category': 'category',
    'payment method': 'payment_method',
    'status': 'status',
    'shipping cost': 'shipping_cost',
    'notes': 'notes',
    'asin': 'asin',
    'quantity': 'quantity',
    'buy price': 'buy_price',
    'sell price': 'sell_price',
    'est fees': 'est_fees'
  };

  // Find column indices
  const columnIndices: { [key: string]: number } = {};
  Object.entries(headerMap).forEach(([header, field]) => {
    const index = headers.findIndex(h => h === header);
    if (index !== -1) {
      columnIndices[field] = index;
    }
  });

  // Parse data rows and convert to format expected by importTransactionsFromCSV
  const transactionData: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < Math.max(...Object.values(columnIndices)) + 1) {
      errors.push(`Row ${i + 1}: Insufficient columns`);
      continue;
    }

    try {
      const rowData = {
        txn_id: columnIndices.txn_id !== undefined ? values[columnIndices.txn_id]?.replace(/"/g, '').trim() || '' : '',
        ordered_date: columnIndices.ordered_date !== undefined ? values[columnIndices.ordered_date]?.replace(/"/g, '').trim() || '' : '',
        delivery_date: columnIndices.delivery_date !== undefined ? values[columnIndices.delivery_date]?.replace(/"/g, '').trim() || '' : '',
        supplier_name: columnIndices.supplier_name !== undefined ? values[columnIndices.supplier_name]?.replace(/"/g, '').trim() || '' : '',
        po_number: columnIndices.po_number !== undefined ? values[columnIndices.po_number]?.replace(/"/g, '').trim() || '' : '',
        category: columnIndices.category !== undefined ? values[columnIndices.category]?.replace(/"/g, '').trim() || 'Stock' : 'Stock',
        payment_method: columnIndices.payment_method !== undefined ? values[columnIndices.payment_method]?.replace(/"/g, '').trim() || 'AMEX Plat' : 'AMEX Plat',
        status: columnIndices.status !== undefined ? values[columnIndices.status]?.replace(/"/g, '').trim() || 'ordered' : 'ordered',
        shipping_cost: parseFloat(columnIndices.shipping_cost !== undefined ? values[columnIndices.shipping_cost]?.replace(/"/g, '') || '0' : '0') || 0,
        notes: columnIndices.notes !== undefined ? values[columnIndices.notes]?.replace(/"/g, '').trim() || '' : '',
        asin: columnIndices.asin !== undefined ? values[columnIndices.asin]?.replace(/"/g, '').trim() || '' : '',
        quantity: parseInt(columnIndices.quantity !== undefined ? values[columnIndices.quantity]?.replace(/"/g, '') || '1' : '1') || 1,
        buy_price: parseFloat(columnIndices.buy_price !== undefined ? values[columnIndices.buy_price]?.replace(/"/g, '') || '0' : '0') || 0,
        sell_price: parseFloat(columnIndices.sell_price !== undefined ? values[columnIndices.sell_price]?.replace(/"/g, '') || '0' : '0') || 0,
        est_fees: parseFloat(columnIndices.est_fees !== undefined ? values[columnIndices.est_fees]?.replace(/"/g, '') || '0' : '0') || 0
      };

      // Skip rows without required data
      if (!rowData.supplier_name || !rowData.asin) {
        continue;
      }

      transactionData.push(rowData);
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  }

  // Use existing import function
  try {
    const result = await importTransactionsFromCSV(transactionData);
    return {
      imported: result.imported,
      errors: [...errors, ...result.errors]
    };
  } catch (err) {
    errors.push(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return { imported: 0, errors };
  }
};

const importGeneralLedgerCSV = async (csvContent: string): Promise<{ imported: number; errors: string[] }> => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  let imported = 0;
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { imported: 0, errors };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
  
  // Map headers to expected field names
  const headerMap: { [key: string]: string } = {
    'txn id': 'txn_id',
    'date': 'date',
    'category': 'category',
    'reference': 'reference',
    'type': 'type',
    'amount': 'amount',
    'payment method': 'payment_method',
    'status': 'status',
    'director name': 'director_name'
  };

  // Find column indices
  const columnIndices: { [key: string]: number } = {};
  Object.entries(headerMap).forEach(([header, field]) => {
    const index = headers.findIndex(h => h === header);
    if (index !== -1) {
      columnIndices[field] = index;
    }
  });

  // Check for required columns
  const requiredColumns = ['date', 'category', 'type', 'amount'];
  const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    return { imported: 0, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < Math.max(...Object.values(columnIndices)) + 1) {
      errors.push(`Row ${i + 1}: Insufficient columns`);
      continue;
    }

    try {
      const rowData = {
        date: columnIndices.date !== undefined ? values[columnIndices.date]?.replace(/"/g, '').trim() || '' : '',
        category: columnIndices.category !== undefined ? values[columnIndices.category]?.replace(/"/g, '').trim() || '' : '',
        reference: columnIndices.reference !== undefined ? values[columnIndices.reference]?.replace(/"/g, '').trim() || '' : '',
        type: columnIndices.type !== undefined ? values[columnIndices.type]?.replace(/"/g, '').trim() || '' : '',
        amount: parseFloat(columnIndices.amount !== undefined ? values[columnIndices.amount]?.replace(/"/g, '') || '0' : '0') || 0,
        payment_method: columnIndices.payment_method !== undefined ? values[columnIndices.payment_method]?.replace(/"/g, '').trim() || 'AMEX Plat' : 'AMEX Plat',
        status: columnIndices.status !== undefined ? values[columnIndices.status]?.replace(/"/g, '').trim() || 'pending' : 'pending',
        director_name: columnIndices.director_name !== undefined ? values[columnIndices.director_name]?.replace(/"/g, '').trim() || undefined : undefined
      };

      // Validate required fields
      if (!rowData.date || !rowData.category || !rowData.type || rowData.amount === 0) {
        errors.push(`Row ${i + 1}: Missing required data`);
        continue;
      }

      // Create the transaction
      await createGeneralLedgerTransaction(rowData);
      imported++;

    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Import error'}`);
    }
  }

  return { imported, errors };
};

// --- UTILITY FUNCTIONS ---

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};