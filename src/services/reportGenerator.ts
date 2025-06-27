import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { TransactionWithMetrics, TransactionItem, ASIN } from '../types/database';
import { formatCurrency, formatDate } from '../utils/formatters';

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

// --- ENTRY POINT FUNCTION ---

export const generateExpenseReportBackup = async (): Promise<void> => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const zipFilename = `expense-backup-${currentDate}.zip`;

    const [transactions, transactionItems, receipts] = await Promise.all([
      getTransactionsForReport(),
      getTransactionItemsForReport(),
      getAllUserReceipts()
    ]);

    const transactionsWithItems = combineTransactionData(transactions, transactionItems, receipts);

    const pdfBlob = await generatePDFReport(transactionsWithItems);

    const zipBlob = await createZipFile(pdfBlob, receipts, currentDate, transactionsWithItems);

    downloadBlob(zipBlob, zipFilename);

  } catch (error) {
    console.error('Error generating expense report backup:', error);
    throw new Error('Failed to generate expense report backup');
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
    const totalCost = (item.buy_price + (item.est_fees || 0)) * item.quantity;
    const totalRevenue = item.sell_price * item.quantity;
    const estimatedProfit = totalRevenue - totalCost;
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

const getAllUserReceipts = async (): Promise<{ name: string; blob: Blob }[]> => {
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
                return fileData ? { name: file.name, blob: fileData } : null;
            } catch (err) {
                console.warn(`Error processing receipt ${file.name}:`, err);
                return null;
            }
        });

        const receipts = await Promise.all(downloadPromises);
        return receipts.filter((receipt): receipt is { name: string; blob: Blob } => receipt !== null);

    } catch (error) {
        console.error('Error fetching receipts:', error);
        return [];
    }
};

const combineTransactionData = (
  transactions: TransactionWithMetrics[],
  transactionItems: TransactionItemWithDetails[],
  receipts: { name: string; blob: Blob }[]
): TransactionForReport[] => {
  return transactions.map(transaction => {
    const items = transactionItems.filter(item => item.transaction_id === transaction.id);
    const itemsCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const totalCost = itemsCost + transaction.shipping_cost;
    const totalRevenue = items.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
    const estimatedProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;
    
    // Generate new receipt naming convention
    const transactionReceipts = receipts
      .filter(receipt => receipt.name.startsWith(transaction.id))
      .map((receipt, index) => `${transaction.id.slice(0, 8).toUpperCase()}-R${(index + 1).toString().padStart(2, '0')}`);

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

// --- PDF GENERATION LOGIC ---

const generatePDFReport = async (transactions: TransactionForReport[]): Promise<Blob> => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
    });

    // --- DOCUMENT CONSTANTS ---
    const MARGIN = 10;
    let yPosition = MARGIN;

    // Calculate summary stats
    const totalSpend = transactions.reduce((sum, t) => sum + t.totalCost, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.estimatedProfit, 0);
    const totalROI = transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.roi, 0) / transactions.length
        : 0;

    // --- TITLE SECTION ---
    doc.setFillColor('#3b82f6');
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Expense Report Backup', MARGIN + 10, yPosition + 35);
    
    yPosition += 50;

    // --- SUMMARY TABLE ---
    doc.autoTable({
        startY: yPosition,
        head: [['Generated:', 'Total Transactions:', 'Total Spend:', 'Total Est. Profit:', 'Avg ROI:']],
        body: [[
            formatDate(new Date().toISOString()),
            String(transactions.length),
            formatCurrency(totalSpend),
            formatCurrency(totalProfit),
            `${totalROI.toFixed(1)}%`
        ]],
        theme: 'plain',
        styles: {
            fontSize: 11,
            cellPadding: 5,
        },
        headStyles: {
            fontStyle: 'normal',
            textColor: [0, 0, 0],
            fillColor: [255, 255, 255],
        },
        bodyStyles: {
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 100 },
            2: { cellWidth: 100 },
            3: { 
                cellWidth: 100,
                textColor: totalProfit >= 0 ? [16, 185, 129] : [239, 68, 68]
            },
            4: { 
                cellWidth: 100,
                textColor: totalROI >= 0 ? [16, 185, 129] : [239, 68, 68]
            }
        },
        margin: { left: MARGIN, right: MARGIN },
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // --- TRANSACTIONS TABLE ---
    transactions.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.getHeight() - 200) {
            doc.addPage();
            yPosition = MARGIN;
        }

        // Transaction header table
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
            headStyles: {
                fillColor: [71, 85, 105],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4
            },
            columnStyles: {
                0: { textColor: [59, 130, 246], fontStyle: 'bold' }, // TXN ID
                6: { halign: 'right' }, // Total Cost
                7: { 
                    halign: 'right',
                    textColor: transaction.roi >= 0 ? [16, 185, 129] : [239, 68, 68]
                } // ROI
            },
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: 'auto'
        });

        yPosition = doc.lastAutoTable.finalY + 5;

        // Items table (if items exist)
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
                headStyles: {
                    fillColor: [100, 116, 139],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 200 }, // Title - wider column
                    1: { cellWidth: 60 },   // Category
                    2: { cellWidth: 80 },   // ASIN
                    3: { cellWidth: 30, halign: 'center' }, // QTY
                    4: { cellWidth: 50, halign: 'right' },  // COG
                    5: { cellWidth: 50, halign: 'right' }   // TOTAL
                },
                margin: { left: MARGIN, right: MARGIN },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                }
            });

            yPosition = doc.lastAutoTable.finalY + 5;
        }

        // Associated Receipts (if any)
        if (transaction.receiptFiles.length > 0) {
            // Create a single-cell table for Associated Receipts header
            doc.autoTable({
                startY: yPosition,
                head: [['Associated Receipts']],
                body: [['']],
                theme: 'plain',
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [100, 116, 139],
                    fontSize: 9,
                    fontStyle: 'bold',
                    cellPadding: 5
                },
                bodyStyles: {
                    fillColor: [255, 255, 255],
                    cellPadding: 0,
                    minCellHeight: 0
                },
                margin: { left: MARGIN, right: MARGIN }
            });
            
            yPosition = doc.lastAutoTable.finalY;
            
            // Display receipts with em dashes between them
            let receiptText = '';
            transaction.receiptFiles.forEach((fileName, index) => {
                receiptText += fileName;
                if (index < transaction.receiptFiles.length - 1) {
                    receiptText += ' — ';
                }
            });
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor('#1e293b');
            doc.text(receiptText, MARGIN + 15, yPosition + 15, { 
                maxWidth: doc.internal.pageSize.getWidth() - (MARGIN * 2) - 30 
            });

            // Calculate height based on text wrapping
            const textLines = doc.splitTextToSize(receiptText, doc.internal.pageSize.getWidth() - (MARGIN * 2) - 30);
            yPosition += 15 + (textLines.length * 10);
        }

        yPosition += 15; // Space between transactions
    });
    
    return doc.output('blob');
};

// --- ZIP & DOWNLOAD HELPERS ---

const createZipFile = async (
  pdfBlob: Blob,
  receipts: { name: string; blob: Blob }[],
  currentDate: string,
  transactions: TransactionForReport[]
): Promise<Blob> => {
  const zip = new JSZip();
  zip.file(`expense-report-${currentDate}.pdf`, pdfBlob);

  const receiptsFolder = zip.folder('receipts');
  if (receiptsFolder) {
    // Create a map of original receipt names to new names
    const receiptNameMap = new Map<string, string>();
    
    transactions.forEach(transaction => {
      const transactionReceipts = receipts.filter(receipt => 
        receipt.name.startsWith(transaction.id)
      );
      
      transactionReceipts.forEach((receipt, index) => {
        const newName = `${transaction.id.slice(0, 8).toUpperCase()}-R${(index + 1).toString().padStart(2, '0')}.${receipt.name.split('.').pop()}`;
        receiptNameMap.set(receipt.name, newName);
      });
    });

    // Add receipts with new names
    for (const receipt of receipts) {
      const newName = receiptNameMap.get(receipt.name) || receipt.name;
      receiptsFolder.file(newName, receipt.blob);
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
};

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