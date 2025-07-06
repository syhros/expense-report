// CSV helper functions for ASIN management
export const generateASINTemplate = (): string => {
  const headers = ['ASIN', 'Image URL', 'Title', 'Type', 'Size', 'Brand', 'Category', 'buy_price', 'sell_price', 'est_fee'];
  return headers.join(',') + '\n';
};

export const downloadCSVTemplate = () => {
  const csvContent = generateASINTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'asin_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parseCSVLine = (line: string): string[] => {
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

export const validateASINData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required fields validation
  if (!data.asin || data.asin.trim() === '') { 
    errors.push('ASIN is required');
  }
  
  if (data.asin && (data.asin.length < 10 || data.asin.length > 10)) {
    errors.push('ASIN must be exactly 10 characters');
  }
  
  if (data.type && !['Single', 'Bundle'].includes(data.type)) {
    errors.push('Type must be either "Single" or "Bundle"');
  }
  
  if (data.size && isNaN(parseInt(data.size))) {
    errors.push('Size must be a valid number');
  }

  if (data.category && !['Stock', 'Other'].includes(data.category)) {
    errors.push('Category must be either "Stock" or "Other"');
  }

  // Optional pricing fields validation
  if (data.buy_price && isNaN(parseFloat(data.buy_price))) {
    errors.push('Buy price must be a valid number');
  }
  
  if (data.sell_price && isNaN(parseFloat(data.sell_price))) {
    errors.push('Sell price must be a valid number');
  }
  
  if (data.est_fee && isNaN(parseFloat(data.est_fee))) {
    errors.push('Estimated fee must be a valid number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const parseASINCSV = (csvContent: string): { data: any[]; errors: string[] } => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  const data: any[] = [];
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { data, errors };
  }
  
  // Parse headers and normalize them for comparison
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
  
  // Define expected headers with their normalized versions for matching
  const expectedHeaders = [
    { name: 'asin', variations: ['asin'] },
    { name: 'image url', variations: ['image url', 'imageurl', 'image_url', 'image'] },
    { name: 'title', variations: ['title'] },
    { name: 'type', variations: ['type'] },
    { name: 'size', variations: ['size'] },
    { name: 'brand', variations: ['brand'] },
    { name: 'category', variations: ['category'] },
    { name: 'buy_price', variations: ['buy_price', 'buy price', 'cost', 'cog', 'purchase price', 'purchase_price'] },
    { name: 'sell_price', variations: ['sell_price', 'sell price', 'selling price', 'selling_price', 'price'] },
    { name: 'est_fee', variations: ['est_fee', 'est fee', 'estimated fee', 'estimated_fee', 'fee', 'fees', 'amazon fee'] }
  ];
  
  // Find column indices using improved matching
  const columnIndices: { [key: string]: number } = {};
  const foundHeaders: string[] = [];
  
  expectedHeaders.forEach(expected => {
    const index = headers.findIndex(header => 
      expected.variations.some(variation => 
        header.replace(/\s+/g, '').includes(variation.replace(/\s+/g, '')) ||
        header === variation
      )
    );
    
    if (index !== -1) {
      columnIndices[expected.name.replace(' ', '_')] = index;
      foundHeaders.push(expected.name);
    }
  });
  
  // Check for missing required headers
  const missingHeaders = expectedHeaders
    .filter(expected => expected.name !== 'category' && !foundHeaders.includes(expected.name))
    .map(expected => expected.name);
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
    return { data, errors };
  }
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < Math.max(...Object.values(columnIndices)) + 1) {
      errors.push(`Row ${i + 1}: Insufficient columns`);
      continue;
    }

    // Parse numeric values safely
    const buyPrice = columnIndices.buy_price !== undefined ? 
      parseFloat(values[columnIndices.buy_price]?.replace(/"/g, '').trim() || '0') : 0;
    
    const sellPrice = columnIndices.sell_price !== undefined ? 
      parseFloat(values[columnIndices.sell_price]?.replace(/"/g, '').trim() || '0') : 0;
    
    const estFee = columnIndices.est_fee !== undefined ? 
      parseFloat(values[columnIndices.est_fee]?.replace(/"/g, '').trim() || '0') : 0;

    const rowData = {
      asin: values[columnIndices.asin]?.replace(/"/g, '').trim() || '',
      image_url: values[columnIndices.image_url]?.replace(/"/g, '').trim() || '',
      title: values[columnIndices.title]?.replace(/"/g, '').trim() || '',
      type: values[columnIndices.type]?.replace(/"/g, '').trim() || 'Single',
      pack: parseInt(values[columnIndices.size]?.replace(/"/g, '').trim()) || 1,
      brand: values[columnIndices.brand]?.replace(/"/g, '').trim() || '',
      category: values[columnIndices.category]?.replace(/"/g, '').trim() || 'Stock',
      buy_price: isNaN(buyPrice) ? 0 : buyPrice,
      sell_price: isNaN(sellPrice) ? 0 : sellPrice,
      est_fee: isNaN(estFee) ? 0 : estFee,
      has_pricing: (buyPrice > 0 || sellPrice > 0 || estFee > 0)
    };
    
    const validation = validateASINData(rowData);
    if (!validation.isValid) {
      errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
      continue;
    }
    
    data.push(rowData);
  }
  
  return { data, errors };
};