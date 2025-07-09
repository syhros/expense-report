// Utility functions for parsing Amazon Pack Group CSV files

export interface ParsedPackGroupData {
  packGroupName: string;
  totalBoxCount: number;
  items: ParsedPackGroupItem[];
}

export interface ParsedPackGroupItem {
  sku: string;
  title: string;
  asin: string;
  fnsku: string;
  prepType: string;
  expectedQuantity: number;
  orderIndex: number;
}

// Helper function to parse CSV content
const parseCSVContent = (content: string): string[][] => {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  return lines.map(line => {
    // Handle quoted values with commas inside
    const result: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    result.push(currentValue);
    return result;
  });
};

// Extract pack group name from CSV content or filename
const extractPackGroupName = (content: string, filename: string): string => {
  const rows = parseCSVContent(content);
  
  // Try to find pack group in content
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[0]?.includes('Pack group:') && row[1]) {
      return `Pack Group ${row[1].trim()}`;
    }
  }
  
  // Fall back to filename parsing
  if (filename.includes('Pack Group')) {
    const match = filename.match(/Pack Group[^\d]*(\d+)/i);
    if (match && match[1]) {
      return `Pack Group ${match[1]}`;
    }
  }
  
  // Default fallback
  return 'Pack Group 1';
};

// Extract total box count from CSV content
const extractTotalBoxCount = (content: string): number => {
  const rows = parseCSVContent(content);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(cell => cell.includes('Total box count'))) {
      // Find the box count value in the row
      for (let j = 0; j < row.length; j++) {
        if (row[j] && row[j].trim() !== '' && !isNaN(parseInt(row[j].trim()))) {
          return parseInt(row[j].trim());
        }
      }
    }
  }
  
  return 1; // Default to 1 box if not found
};

// Find the header row index
const findHeaderRowIndex = (rows: string[][]): number => {
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].join(' ').toLowerCase();
    if (rowText.includes('sku') && 
        rowText.includes('asin') && 
        rowText.includes('expected quantity')) {
      return i;
    }
  }
  return -1;
};

// Parse Amazon Pack Group CSV file
export const parseAmazonPackGroupCsv = async (file: File): Promise<ParsedPackGroupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        // Parse CSV content
        const rows = parseCSVContent(content);
        
        // Extract pack group name and box count
        const packGroupName = extractPackGroupName(content, file.name);
        const totalBoxCount = extractTotalBoxCount(content);
        
        // Find the header row
        const headerRowIndex = findHeaderRowIndex(rows);
        if (headerRowIndex === -1) {
          reject(new Error('Could not find header row in CSV file'));
          return;
        }
        
        // Map column indices
        const headers = rows[headerRowIndex];
        const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'));
        const titleIndex = headers.findIndex(h => h.toLowerCase().includes('product title') || h.toLowerCase().includes('title'));
        const asinIndex = headers.findIndex(h => h.toLowerCase().includes('asin'));
        const fnskuIndex = headers.findIndex(h => h.toLowerCase().includes('fnsku'));
        const prepTypeIndex = headers.findIndex(h => h.toLowerCase().includes('prep type') || h.toLowerCase().includes('prep'));
        const expectedQuantityIndex = headers.findIndex(h => h.toLowerCase().includes('expected quantity') || h.toLowerCase().includes('expected'));
        
        if (skuIndex === -1 || asinIndex === -1 || expectedQuantityIndex === -1) {
          reject(new Error('Required columns (SKU, ASIN, Expected quantity) not found in CSV'));
          return;
        }
        
        const items: ParsedPackGroupItem[] = [];
        let orderIndex = 0;
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          
          // Skip empty rows or rows without SKU/ASIN
          if (row.length <= Math.max(skuIndex, asinIndex, expectedQuantityIndex) || 
              !row[skuIndex] || !row[asinIndex]) {
            continue;
          }
          
          // Skip rows with box details or other metadata
          if (row[0]?.includes('Name of box') || 
              row[0]?.includes('Box weight') || 
              row[0]?.includes('Box width') || 
              row[0]?.includes('Box length') ||
              row[0]?.includes('Box height') || 
              row[0]?.trim() === '' ||
              row[0]?.includes('Provide the box details')) {
            continue;
          }
          
          const expectedQuantity = parseInt(row[expectedQuantityIndex]) || 0;
          if (expectedQuantity <= 0) continue;
          
          items.push({
            sku: row[skuIndex]?.replace(/"/g, '') || '',
            title: row[titleIndex]?.replace(/"/g, '') || '',
            asin: row[asinIndex]?.replace(/"/g, '') || '',
            fnsku: row[fnskuIndex]?.replace(/"/g, '') || '',
            prepType: row[prepTypeIndex]?.replace(/"/g, '') || 'None',
            expectedQuantity: expectedQuantity,
            orderIndex: orderIndex++
          });
        }
        
        if (items.length === 0) {
          reject(new Error('No valid items found in CSV file'));
          return;
        }
        
        resolve({
          packGroupName,
          totalBoxCount,
          items
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Parse multiple CSV files
export const parseMultiplePackGroupCsvs = async (files: File[]): Promise<ParsedPackGroupData[]> => {
  const results: ParsedPackGroupData[] = [];
  
  for (const file of files) {
    try {
      const data = await parseAmazonPackGroupCsv(file);
      results.push(data);
    } catch (error) {
      console.error(`Error parsing file ${file.name}:`, error);
      throw new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

// Validate CSV file format
export const isValidPackGroupCsv = (file: File): boolean => {
  return file.name.endsWith('.csv') || file.type === 'text/csv';
};