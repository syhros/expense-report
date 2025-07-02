import { supabase } from '../lib/supabase';
import { createSupplier, getSuppliers, findOrCreateASIN, createTransaction, createTransactionItem, getTransactions, updateTransaction } from './database';

interface ImportTransactionData {
  txn_id: string;
  ordered_date: string;
  delivery_date: string;
  supplier_name: string;
  category: string;
  payment_method: string;
  status: string;
  shipping_cost: number;
  notes: string;
  po_number: string;
  asin: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  est_fees: number;
}

export const importTransactionsFromCSV = async (transactionData: ImportTransactionData[]): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Get existing suppliers and transactions to avoid duplicates
  const [existingSuppliers, existingTransactions] = await Promise.all([
    getSuppliers(),
    getTransactions()
  ]);
  
  const supplierMap = new Map(existingSuppliers.map(s => [s.name.toLowerCase(), s]));
  const transactionMap = new Map(existingTransactions.map(t => [t.id, t]));

  // Group transactions by TXN ID or PO Number
  const transactionGroups = new Map<string, ImportTransactionData[]>();
  
  transactionData.forEach(row => {
    // Use TXN ID if provided, otherwise fall back to PO Number grouping
    let key: string;
    
    if (row.txn_id && row.txn_id.trim() !== '') {
      // If TXN ID is provided, use it as the key
      key = `txn:${row.txn_id.trim()}`;
    } else {
      // Fall back to PO Number grouping for new transactions
      key = `po:${row.po_number?.trim() || `${row.supplier_name.toLowerCase()}-${row.ordered_date}`}`;
    }
    
    if (!transactionGroups.has(key)) {
      transactionGroups.set(key, []);
    }
    transactionGroups.get(key)!.push(row);
  });

  for (const [groupKey, items] of transactionGroups) {
    try {
      const firstItem = items[0];
      const isExistingTransaction = groupKey.startsWith('txn:');
      const txnId = isExistingTransaction ? groupKey.substring(4) : null;
      
      // Validate that all items in the group have consistent transaction-level data
      const inconsistentFields = [];
      const checkFields = ['supplier_name', 'ordered_date', 'delivery_date', 'category', 'payment_method', 'status'];
      
      for (const field of checkFields) {
        const values = new Set(items.map(item => item[field as keyof ImportTransactionData]));
        if (values.size > 1) {
          inconsistentFields.push(field);
        }
      }
      
      if (inconsistentFields.length > 0) {
        errors.push(`Group ${groupKey}: Inconsistent data in fields: ${inconsistentFields.join(', ')}`);
        skipped++;
        continue;
      }
      
      // Find or create supplier
      let supplier = supplierMap.get(firstItem.supplier_name.toLowerCase());
      if (!supplier) {
        supplier = await createSupplier({
          name: firstItem.supplier_name,
          address: '',
          email: '',
          phone: '',
          site: '',
          notes: ''
        });
        supplierMap.set(supplier.name.toLowerCase(), supplier);
      }

      // Calculate total shipping cost for the transaction (sum from all items or use first item's value)
      const totalShippingCost = items.reduce((sum, item) => sum + item.shipping_cost, 0);

      let transaction;
      
      if (isExistingTransaction && txnId && transactionMap.has(txnId)) {
        // Update existing transaction
        console.log(`Updating existing transaction: ${txnId}`);
        
        transaction = await updateTransaction(txnId, {
          ordered_date: firstItem.ordered_date || null,
          delivery_date: firstItem.delivery_date || null,
          supplier_id: supplier.id,
          po_number: firstItem.po_number || '',
          category: firstItem.category,
          payment_method: firstItem.payment_method,
          status: firstItem.status,
          shipping_cost: totalShippingCost,
          notes: firstItem.notes
        });
        
        // For existing transactions, we should ideally handle item updates/deletions
        // For now, we'll just add new items (this could be enhanced to do full sync)
        
      } else {
        // Create new transaction
        console.log(`Creating new transaction for group: ${groupKey}`);
        
        transaction = await createTransaction({
          ordered_date: firstItem.ordered_date || null,
          delivery_date: firstItem.delivery_date || null,
          supplier_id: supplier.id,
          po_number: firstItem.po_number || '', // Use provided PO Number or auto-generate
          category: firstItem.category,
          payment_method: firstItem.payment_method,
          status: firstItem.status,
          shipping_cost: totalShippingCost,
          notes: firstItem.notes
        });
      }

      // Create transaction items for all line items under this transaction
      let itemsCreated = 0;
      for (const item of items) {
        try {
          // Find or create ASIN with proper category
          await findOrCreateASIN({
            asin: item.asin,
            title: '',
            brand: '',
            image_url: '',
            type: 'Single',
            pack: 1,
            category: item.category || 'Other' // Use item category or default to Other
          });

          // Ensure numeric values are properly converted
          const quantity = Number(item.quantity) || 1;
          const buyPrice = Number(item.buy_price) || 0;
          const sellPrice = Number(item.sell_price) || 0;
          const estFees = Number(item.est_fees) || 0;

          console.log(`Creating item for ${item.asin}:`, {
            quantity,
            buyPrice,
            sellPrice,
            estFees
          });

          // Create transaction item with explicit numeric conversion
          await createTransactionItem({
            transaction_id: transaction.id,
            asin: item.asin,
            quantity: quantity,
            buy_price: buyPrice,
            sell_price: sellPrice,
            est_fees: estFees
          });

          itemsCreated++;

        } catch (itemError) {
          console.error(`Error creating item ${item.asin}:`, itemError);
          errors.push(`Failed to create item ${item.asin} for transaction ${transaction.id}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
        }
      }

      if (itemsCreated > 0) {
        imported++;
      } else {
        skipped++;
        errors.push(`No items could be created for transaction group ${groupKey}`);
      }

    } catch (transactionError) {
      console.error(`Error processing transaction group ${groupKey}:`, transactionError);
      errors.push(`Failed to process transaction group ${groupKey}: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
};