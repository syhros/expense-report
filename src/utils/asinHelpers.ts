// ASIN export functionality
import { ASIN } from '../types/database';

export const generateASINExportCSV = (asins: ASIN[]): string => {
  const headers = ['ASIN', 'Image URL', 'Title', 'Type', 'Size', 'Brand', 'Category', 'Weight', 'Weight Unit', 'FNSKU', 'Buy Price', 'Sell Price', 'Est Fee'];
  
  const csvRows = asins.map(asin => [
    asin.asin || '',
    asin.image_url || '',
    asin.title || '',
    asin.type || 'Single',
    asin.pack?.toString() || '1',
    asin.brand || '',
    asin.category || 'Stock',
    asin.weight?.toString() || '0',
    asin.weight_unit || 'g',
    asin.fnsku || '',
    '', // Buy Price (empty by default, will be filled from pricing history)
    '', // Sell Price (empty by default, will be filled from pricing history)
    ''  // Est Fee (empty by default, will be filled from pricing history)
  ]);
  
  let csvContent = headers.join(',') + '\n';
  csvRows.forEach(row => {
    // Escape commas and quotes in data
    const escapedRow = row.map(field => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    });
    csvContent += escapedRow.join(',') + '\n';
  });
  
  return csvContent;
};

// Updated version that includes pricing data from pricing history
export const generateASINExportCSVWithPricing = async (asins: ASIN[]): Promise<string> => {
  const headers = ['ASIN', 'Image URL', 'Title', 'Type', 'Size', 'Brand', 'Category', 'Weight', 'Weight Unit', 'FNSKU', 'Buy Price', 'Sell Price', 'Est Fee'];
  
  // Get pricing data for all ASINs
  const pricingData = new Map<string, { buy_price: number; sell_price: number; est_fees: number }>();
  
  try {
    // Import the getLatestASINPricing function
    const { getLatestASINPricing } = await import('../services/database');
    
    // Fetch pricing data for each ASIN
    for (const asin of asins) {
      try {
        const pricing = await getLatestASINPricing(asin.asin);
        if (pricing) {
          pricingData.set(asin.asin, pricing);
        }
      } catch (error) {
        console.error(`Failed to fetch pricing for ${asin.asin}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to import getLatestASINPricing:', error);
  }
  
  const csvRows = asins.map(asin => {
    const pricing = pricingData.get(asin.asin);
    
    return [
      asin.asin || '',
      asin.image_url || '',
      asin.title || '',
      asin.type || 'Single',
      asin.pack?.toString() || '1',
      asin.brand || '',
      asin.category || 'Stock',
      asin.weight?.toString() || '0',
      asin.weight_unit || 'g',
      asin.fnsku || '',
      pricing ? pricing.buy_price.toString() : '',
      pricing ? pricing.sell_price.toString() : '',
      pricing ? pricing.est_fees.toString() : ''
    ];
  });
  
  let csvContent = headers.join(',') + '\n';
  csvRows.forEach(row => {
    // Escape commas and quotes in data
    const escapedRow = row.map(field => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    });
    csvContent += escapedRow.join(',') + '\n';
  });
  
  return csvContent;
};

export const downloadASINExport = (asins: ASIN[]) => {
  // Use the async version with pricing data
  generateASINExportCSVWithPricing(asins).then(csvContent => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const currentDate = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `asins-export-${currentDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }).catch(error => {
    console.error('Failed to generate ASIN export:', error);
    alert('Failed to generate ASIN export. Please try again.');
  });
};