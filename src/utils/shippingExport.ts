import { ShipmentWithDetails } from '../types/database';

// Generate CSV content for Amazon Seller Central import
export const generateShipmentExportCSV = (shipment: ShipmentWithDetails): string => {
  let csvContent = '';
  
  // Process each pack group
  shipment.pack_groups.forEach((packGroup, packGroupIndex) => {
    // Add pack group header
    csvContent += `${packGroup.name}\n`;
    csvContent += '\n'; // Empty line after header
    
    // Create headers for this pack group
    const headers = ['ASIN', 'FNSKU', 'Boxed quantity'];
    
    // Add box quantity headers
    packGroup.boxes.forEach(box => {
      headers.push(`${box.name} quantity`);
    });
    
    csvContent += headers.join(',') + '\n';
    
    // Add product rows (maintain original order from CSV)
    packGroup.items
      .sort((a, b) => a.order_index - b.order_index) // Ensure original order
      .forEach(item => {
        const row = [
          item.asin,
          item.asin_details?.fnsku || '',
          item.total_boxed.toString()
        ];
        
        // Add box quantities for each box
        packGroup.boxes.forEach(box => {
          const quantity = item.boxed_quantities[box.id] || 0;
          row.push(quantity.toString());
        });
        
        csvContent += row.join(',') + '\n';
      });
    
    // Add empty line before box details
    csvContent += '\n';
    
    // Add box details section
    csvContent += 'Name of box,Box weight (kg):,Box width (cm):,Box length (cm):,Box height (cm):\n';
    
    packGroup.boxes.forEach(box => {
      const boxRow = [
        box.name,
        box.weight?.toString() || '0',
        box.width?.toString() || '0',
        box.length?.toString() || '0',
        box.height?.toString() || '0'
      ];
      csvContent += boxRow.join(',') + '\n';
    });
    
    // Add spacing between pack groups (except for the last one)
    if (packGroupIndex < shipment.pack_groups.length - 1) {
      csvContent += '\n\n';
    }
  });
  
  return csvContent;
};

// Download the CSV file
export const downloadShipmentExport = (shipment: ShipmentWithDetails): void => {
  const csvContent = generateShipmentExportCSV(shipment);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${shipment.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Validate shipment data before export
export const validateShipmentForExport = (shipment: ShipmentWithDetails): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (shipment.pack_groups.length === 0) {
    errors.push('Shipment has no pack groups');
    return { isValid: false, errors };
  }
  
  shipment.pack_groups.forEach((packGroup, packGroupIndex) => {
    if (packGroup.items.length === 0) {
      errors.push(`${packGroup.name} has no items`);
    }
    
    if (packGroup.boxes.length === 0) {
      errors.push(`${packGroup.name} has no boxes`);
    }
    
    // Check if all items have been fully allocated
    packGroup.items.forEach(item => {
      if (item.remaining > 0) {
        errors.push(`${packGroup.name}: ${item.asin} has ${item.remaining} units not allocated to boxes`);
      }
      if (item.remaining < 0) {
        errors.push(`${packGroup.name}: ${item.asin} has been over-allocated by ${Math.abs(item.remaining)} units`);
      }
    });
    
    // Check if boxes have dimensions and weights
    packGroup.boxes.forEach(box => {
      if (!box.weight || box.weight <= 0) {
        errors.push(`${packGroup.name}: ${box.name} is missing weight`);
      }
      if (!box.width || box.width <= 0) {
        errors.push(`${packGroup.name}: ${box.name} is missing width`);
      }
      if (!box.length || box.length <= 0) {
        errors.push(`${packGroup.name}: ${box.name} is missing length`);
      }
      if (!box.height || box.height <= 0) {
        errors.push(`${packGroup.name}: ${box.name} is missing height`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};