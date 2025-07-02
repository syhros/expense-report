// ASIN export functionality
import { ASIN } from '../types/database';

export const generateASINExportCSV = (asins: ASIN[]): string => {
  const headers = ['ASIN', 'Image URL', 'Title', 'Type', 'Size', 'Brand', 'Category'];
  
  const csvRows = asins.map(asin => [
    asin.asin || '',
    asin.image_url || '',
    asin.title || '',
    asin.type || 'Single',
    asin.pack?.toString() || '1',
    asin.brand || '',
    asin.category || 'Stock'
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

export const downloadASINExport = (asins: ASIN[]) => {
  const csvContent = generateASINExportCSV(asins);
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
};