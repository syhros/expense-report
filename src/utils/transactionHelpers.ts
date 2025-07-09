// Transaction CSV template and import helpers
const generateTransactionTemplate = (): string => {
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
  
  const sampleRows = [
    [
      '', // Empty TXN ID - will be auto-generated
      '2025-01-15',
      '2025-01-20',
      'Example Supplier',
      'PO-001',
      'Stock',
      'AMEX Plat',
      'ordered',
      '5.99',
      'Sample transaction notes',
      'B08N5WRWNW',
      '10',
      '12.50',
      '25.00',
      '3.75'
    ],
    [
      '', // Empty TXN ID - will be auto-generated
      '2025-01-15',
      '2025-01-20',
      'Example Supplier',
      'PO-001',
      'Stock',
      'AMEX Plat',
      'ordered',
      '0',
      '',
      'B07XJ8C8F5',
      '5',
      '8.99',
      '18.50',
      '2.25'
    ]
  ];
  
  let csvContent = headers.join(',') + '\n';
  sampleRows.forEach(row => {
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
};

export const downloadTransactionTemplate = () => {
  const csvContent = generateTransactionTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'transaction_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

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

const validateTransactionData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.ordered_date || data.ordered_date.trim() === '') {
    errors.push('Ordered Date is required');
  }
  
  if (!data.supplier_name || data.supplier_name.trim() === '') {
    errors.push('Supplier Name is required');
  }
  
  if (!data.asin || data.asin.trim() === '') {
    errors.push('ASIN is required');
  }
  
  // Relaxed ASIN validation - allow any non-empty string (to handle custom ASINs like NO-ASIN-Z7XE)
  if (data.asin && data.asin.trim().length < 3) {
    errors.push('ASIN must be at least 3 characters');
  }
  
  if (!data.quantity || isNaN(parseInt(data.quantity)) || parseInt(data.quantity) <= 0) {
    errors.push('Quantity must be a valid positive number');
  }
  
  // More flexible buy price validation - allow 0 and handle string conversion
  const buyPrice = parseFloat(data.buy_price);
  if (isNaN(buyPrice) || buyPrice < 0) {
    errors.push('Buy Price must be a valid positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to safely parse numeric values from CSV
const parseNumericValue = (value: string | undefined, defaultValue: number = 0): number => {
  if (!value || value.trim() === '') return defaultValue;
  
  // Remove quotes, commas, and whitespace
  const cleaned = value.replace(/[",\s]/g, '');
  
  // Handle empty string after cleaning
  if (cleaned === '') return defaultValue;
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to convert various date formats to YYYY-MM-DD
const convertDateFormat = (dateString: string): string => {
  if (!dateString) return '';
  
  // Try to parse as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Try to parse as DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }

  // Try to parse as MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [month, day, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }

  // Try to parse as YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
    return dateString.replace(/\//g, '-');
  }

  // Fallback for other formats (e.g., ISO strings)
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore parsing errors, return empty string
  }

  return '';
};

const parseIntegerValue = (value: string | undefined, defaultValue: number = 1): number => {
  if (!value || value.trim() === '') return defaultValue;
  
  // Remove quotes, commas, and whitespace
  const cleaned = value.replace(/[",\s]/g, '');
  
  // Handle empty string after cleaning
  if (cleaned === '') return defaultValue;
  
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const parseTransactionCSV = (csvContent: string): { data: any[]; errors: string[] } => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  const data: any[] = [];
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { data, errors };
  }
  
  // Parse headers and normalize them for comparison
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
  
  console.log('Parsed headers:', headers);
  
  // Define expected headers with their exact variations for matching
  const expectedHeaders = [
    { name: 'txn_id', variations: ['txn id', 'txn_id', 'transaction id', 'transaction_id', 'id'] },
    { name: 'ordered_date', variations: ['ordered date', 'ordered_date', 'order date'] },
    { name: 'delivery_date', variations: ['delivery date', 'delivery_date', 'delivered date'] },
    { name: 'supplier_name', variations: ['supplier name', 'supplier_name', 'supplier'] },
    { name: 'po_number', variations: ['po number', 'po_number', 'purchase order', 'po'] },
    { name: 'category', variations: ['category'] },
    { name: 'payment_method', variations: ['payment method', 'payment_method', 'payment'] },
    { name: 'status', variations: ['status'] },
    { name: 'shipping_cost', variations: ['shipping cost', 'shipping_cost', 'shipping'] },
    { name: 'notes', variations: ['notes', 'note'] },
    { name: 'asin', variations: ['asin'] },
    { name: 'quantity', variations: ['quantity', 'qty'] },
    { name: 'buy_price', variations: ['buy price', 'buy_price', 'cost', 'cog'] },
    { name: 'sell_price', variations: ['sell price', 'sell_price', 'selling price'] },
    { name: 'est_fees', variations: ['est fees', 'est_fees', 'estimated fees', 'fees'] }
  ];
  
  // Find column indices using exact matching first, then fuzzy matching
  const columnIndices: { [key: string]: number } = {};
  const foundHeaders: string[] = [];
  
  expectedHeaders.forEach(expected => {
    // First try exact match
    let index = headers.findIndex(header => expected.variations.includes(header));
    
    // If no exact match, try fuzzy matching
    if (index === -1) {
      index = headers.findIndex(header => 
        expected.variations.some(variation => 
          header.replace(/\s+/g, '').includes(variation.replace(/\s+/g, '')) ||
          variation.replace(/\s+/g, '').includes(header.replace(/\s+/g, ''))
        )
      );
    }
    
    if (index !== -1) {
      columnIndices[expected.name] = index;
      foundHeaders.push(expected.name);
      console.log(`Found ${expected.name} at index ${index} (header: "${headers[index]}")`);
    } else {
      console.log(`Could not find column for ${expected.name}`);
    }
  });
  
  console.log('Column indices:', columnIndices);
  
  // Check for missing required headers (TXN ID is optional)
  const requiredHeaders = ['ordered_date', 'supplier_name', 'asin', 'quantity', 'buy_price'];
  const missingHeaders = requiredHeaders.filter(header => !foundHeaders.includes(header));
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    return { data, errors };
  }
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    console.log(`Row ${i + 1} raw values:`, values);
    
    if (values.length < Math.max(...Object.values(columnIndices)) + 1) {
      errors.push(`Row ${i + 1}: Insufficient columns (expected ${Math.max(...Object.values(columnIndices)) + 1}, got ${values.length})`);
      continue;
    }
    
    // Extract values using the found column indices
    const rawQuantity = columnIndices.quantity !== undefined ? values[columnIndices.quantity] : '';
    const rawBuyPrice = columnIndices.buy_price !== undefined ? values[columnIndices.buy_price] : '';
    const rawSellPrice = columnIndices.sell_price !== undefined ? values[columnIndices.sell_price] : '';
    const rawEstFees = columnIndices.est_fees !== undefined ? values[columnIndices.est_fees] : '';
    
    console.log(`Row ${i + 1} raw numeric values:`, {
      quantity: rawQuantity,
      buy_price: rawBuyPrice,
      sell_price: rawSellPrice,
      est_fees: rawEstFees
    });
    
    const rowData = {
      txn_id: columnIndices.txn_id !== undefined ? values[columnIndices.txn_id]?.replace(/"/g, '').trim() || '' : '',
      ordered_date: convertDateFormat(columnIndices.ordered_date !== undefined ? values[columnIndices.ordered_date]?.replace(/"/g, '').trim() || '' : ''),
      delivery_date: convertDateFormat(columnIndices.delivery_date !== undefined ? values[columnIndices.delivery_date]?.replace(/"/g, '').trim() || '' : ''),
      supplier_name: columnIndices.supplier_name !== undefined ? values[columnIndices.supplier_name]?.replace(/"/g, '').trim() || '' : '',
      po_number: columnIndices.po_number !== undefined ? values[columnIndices.po_number]?.replace(/"/g, '').trim() || '' : '',
      category: columnIndices.category !== undefined ? values[columnIndices.category]?.replace(/"/g, '').trim() || 'Stock' : 'Stock',
      payment_method: columnIndices.payment_method !== undefined ? values[columnIndices.payment_method]?.replace(/"/g, '').trim() || 'AMEX Plat' : 'AMEX Plat',
      status: columnIndices.status !== undefined ? values[columnIndices.status]?.replace(/"/g, '').trim() || 'pending' : 'pending',
      shipping_cost: parseNumericValue(columnIndices.shipping_cost !== undefined ? values[columnIndices.shipping_cost] : '', 0),
      notes: columnIndices.notes !== undefined ? values[columnIndices.notes]?.replace(/"/g, '').trim() || '' : '',
      asin: columnIndices.asin !== undefined ? values[columnIndices.asin]?.replace(/"/g, '').trim() || '' : '',
      quantity: parseIntegerValue(rawQuantity, 1),
      buy_price: parseNumericValue(rawBuyPrice, 0),
      sell_price: parseNumericValue(rawSellPrice, 0),
      est_fees: parseNumericValue(rawEstFees, 0)
    };
    
    // Debug logging
    console.log(`Row ${i + 1} parsed values:`, {
      txn_id: rowData.txn_id,
      asin: rowData.asin,
      quantity: rowData.quantity,
      buy_price: rowData.buy_price,
      sell_price: rowData.sell_price,
      est_fees: rowData.est_fees
    });
    
    const validation = validateTransactionData(rowData);
    if (!validation.isValid) {
      errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
      continue;
    }
    
    data.push(rowData);
  }
  
  return { data, errors };
};

// Export functions for external use
export { generateTransactionTemplate, parseCSVLine, validateTransactionData, convertDateFormat };