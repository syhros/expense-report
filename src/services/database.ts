import { supabase } from '../lib/supabase';
import { 
  Supplier, 
  ASIN, 
  ASINWithMetrics,
  Transaction, 
  TransactionWithMetrics,
  TransactionItem, 
  Budget, 
  AmazonTransaction,
  DashboardMetrics,
  SupplierMetrics,
  Category
} from '../types/database';

// Helper function to sanitize date values
const sanitizeDate = (date: string | null | undefined): string | null => {
  if (!date || date.trim() === '') {
    return null;
  }
  return date;
};

// Helper function to sanitize transaction data
const sanitizeTransactionData = (data: any) => {
  return {
    ...data,
    ordered_date: sanitizeDate(data.ordered_date),
    delivery_date: sanitizeDate(data.delivery_date)
  };
};

// Helper function to generate next transaction number
const generateNextTransactionNumber = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get the latest transaction to find the highest number
  const { data: latestTransaction, error } = await supabase
    .from('transactions')
    .select('po_number')
    .eq('user_id', user.id)
    .like('po_number', 'ASH-%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNumber = 1;
  
  if (latestTransaction && latestTransaction.length > 0) {
    const latestPO = latestTransaction[0].po_number;
    if (latestPO && latestPO.startsWith('ASH-')) {
      const numberPart = latestPO.substring(4); // Remove 'ASH-' prefix
      const currentNumber = parseInt(numberPart, 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }
  }

  return `ASH-${nextNumber.toString().padStart(5, '0')}`;
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

// Suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// ASINs - Updated to filter by category
export const getASINs = async (): Promise<ASIN[]> => {
  const { data, error } = await supabase
    .from('asins')
    .select('*')
    .eq('category', 'Stock') // Only return Stock category ASINs
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getASINByCode = async (asinCode: string): Promise<ASIN | null> => {
  const { data, error } = await supabase
    .from('asins')
    .select('*')
    .eq('asin', asinCode)
    .limit(1);
  
  if (error) throw error;
  return data?.[0] || null;
};

export const findOrCreateASIN = async (asinData: Partial<ASIN>): Promise<ASIN> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // First try to find existing ASIN
  if (asinData.asin) {
    const existing = await getASINByCode(asinData.asin);
    if (existing) {
      return existing;
    }
  }

  // Create new ASIN if not found
  const newASIN = {
    asin: asinData.asin || '',
    title: asinData.title || '',
    brand: asinData.brand || '',
    image_url: asinData.image_url || '',
    type: asinData.type || 'Single',
    pack: asinData.pack || 1,
    shipped: asinData.shipped || 0,
    category: asinData.category || 'Stock', // Default to Stock category
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('asins')
    .insert(newASIN)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getASINsWithMetrics = async (): Promise<ASINWithMetrics[]> => {
  const [asins, transactionItems] = await Promise.all([
    getASINs(), // This now only returns Stock category ASINs
    getTransactionItems()
  ]);

  return asins.map(asin => {
    const asinItems = transactionItems.filter(item => item.asin === asin.asin);
    
    // Calculate total cost and quantity for this ASIN
    const totalCost = asinItems.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
    const totalQuantity = asinItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate average buy price (COG)
    const averageBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    
    // Calculate adjusted quantity based on pack size
    const adjustedQuantity = asin.pack > 1 ? Math.floor(totalQuantity / asin.pack) : totalQuantity;
    
    // Calculate stored (total quantity minus shipped)
    const stored = adjustedQuantity - asin.shipped;

    return {
      ...asin,
      averageBuyPrice,
      totalQuantity,
      adjustedQuantity,
      stored
    };
  });
};

export const createASIN = async (asin: Omit<ASIN, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ASIN> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('asins')
    .insert({ ...asin, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateASIN = async (id: string, updates: Partial<ASIN>): Promise<ASIN> => {
  const { data, error } = await supabase
    .from('asins')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteASIN = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('asins')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getTransactionsWithMetrics = async (): Promise<TransactionWithMetrics[]> => {
  const [transactions, transactionItems] = await Promise.all([
    getTransactions(),
    getTransactionItems()
  ]);

  return transactions.map(transaction => {
    const items = transactionItems.filter(item => item.transaction_id === transaction.id);
    
    // Calculate total cost including fees AND shipping
    const itemsCost = items.reduce((sum, item) => sum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
    const totalCost = itemsCost + transaction.shipping_cost;
    
    // Calculate estimated profit
    const totalRevenue = items.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
    const estimatedProfit = totalRevenue - totalCost;
    
    // Calculate ROI
    const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

    return {
      ...transaction,
      totalCost,
      estimatedProfit,
      roi
    };
  });
};

export const getTransactionsByASIN = async (asinCode: string): Promise<TransactionWithMetrics[]> => {
  const [transactions, transactionItems] = await Promise.all([
    getTransactions(),
    getTransactionItems()
  ]);

  // Filter transactions that contain the specified ASIN
  const relevantTransactionIds = transactionItems
    .filter(item => item.asin === asinCode)
    .map(item => item.transaction_id);

  const filteredTransactions = transactions.filter(transaction => 
    relevantTransactionIds.includes(transaction.id)
  );

  // Calculate metrics for filtered transactions
  return filteredTransactions.map(transaction => {
    const items = transactionItems.filter(item => item.transaction_id === transaction.id);
    
    // Calculate total cost including fees AND shipping
    const itemsCost = items.reduce((sum, item) => sum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
    const totalCost = itemsCost + transaction.shipping_cost;
    
    // Calculate estimated profit
    const totalRevenue = items.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
    const estimatedProfit = totalRevenue - totalCost;
    
    // Calculate ROI
    const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

    return {
      ...transaction,
      totalCost,
      estimatedProfit,
      roi
    };
  });
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Auto-generate transaction number if not provided
  let transactionData = { ...transaction };
  if (!transactionData.po_number || transactionData.po_number.trim() === '') {
    transactionData.po_number = await generateNextTransactionNumber();
  }

  // Set default values if not provided
  if (!transactionData.category || transactionData.category.trim() === '') {
    transactionData.category = 'Stock';
  }
  if (!transactionData.payment_method || transactionData.payment_method.trim() === '') {
    transactionData.payment_method = 'AMEX Plat';
  }

  // Sanitize date fields before sending to database
  const sanitizedTransaction = sanitizeTransactionData(transactionData);

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...sanitizedTransaction, user_id: user.id })
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
  // Sanitize date fields before sending to database
  const sanitizedUpdates = sanitizeTransactionData(updates);

  const { data, error } = await supabase
    .from('transactions')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Transaction Items - Fixed to manually join ASIN details
export const getTransactionItems = async (transactionId?: string): Promise<(TransactionItem & { asin_details?: ASIN })[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // First, get transaction items
  let query = supabase
    .from('transaction_items')
    .select('*');
  
  if (transactionId) {
    query = query.eq('transaction_id', transactionId);
  }
  
  const { data: transactionItems, error: itemsError } = await query.order('created_at', { ascending: false });
  
  if (itemsError) throw itemsError;
  
  if (!transactionItems || transactionItems.length === 0) {
    return [];
  }

  // Get all ASINs for the current user (no category filter here since we need all ASINs for transaction items)
  const { data: asins, error: asinsError } = await supabase
    .from('asins')
    .select('*')
    .eq('user_id', user.id);
  
  if (asinsError) throw asinsError;

  // Create a map of ASIN codes to ASIN details for quick lookup
  const asinMap = new Map<string, ASIN>();
  if (asins) {
    asins.forEach(asin => {
      asinMap.set(asin.asin, asin);
    });
  }

  // Manually attach ASIN details to transaction items
  const itemsWithDetails = transactionItems.map(item => ({
    ...item,
    asin_details: asinMap.get(item.asin)
  }));

  return itemsWithDetails;
};

export const createTransactionItem = async (item: Omit<TransactionItem, 'id' | 'created_at'>): Promise<TransactionItem> => {
  const { data, error } = await supabase
    .from('transaction_items')
    .insert(item)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTransactionItem = async (id: string, updates: Partial<TransactionItem>): Promise<TransactionItem> => {
  const { data, error } = await supabase
    .from('transaction_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTransactionItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transaction_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Budgets
export const getBudgets = async (): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getCurrentBudget = async (): Promise<Budget | null> => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .limit(1);
  
  if (error) throw error;
  return data?.[0] || null;
};

export const createOrUpdateBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Budget> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { ...budget, user_id: user.id },
      { 
        onConflict: 'month,year,user_id',
        ignoreDuplicates: false 
      }
    )
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Amazon Transactions
export const getAmazonTransactions = async (): Promise<AmazonTransaction[]> => {
  const { data, error } = await supabase
    .from('amazon_transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createAmazonTransaction = async (transaction: Omit<AmazonTransaction, 'id' | 'user_id' | 'created_at'>): Promise<AmazonTransaction> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('amazon_transactions')
    .insert({ ...transaction, user_id: user.id })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAmazonTransaction = async (id: string, updates: Partial<AmazonTransaction>): Promise<AmazonTransaction> => {
  const { data, error } = await supabase
    .from('amazon_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteAllAmazonTransactions = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('amazon_transactions')
    .delete()
    .eq('user_id', user.id);
  
  if (error) throw error;
};

// Dashboard Metrics
export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const [transactions, transactionItems, currentBudget] = await Promise.all([
    getTransactions(),
    getTransactionItems(),
    getCurrentBudget()
  ]);

  // Calculate total orders
  const totalOrders = transactions.length;

  // Calculate total stock ordered
  const totalStockOrdered = transactionItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate monthly spend (current month) - including shipping costs
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    if (!t.ordered_date) return false;
    const orderDate = new Date(t.ordered_date);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const monthlySpend = monthlyTransactions.reduce((sum, transaction) => {
    const transactionTotal = transactionItems
      .filter(item => item.transaction_id === transaction.id)
      .reduce((itemSum, item) => itemSum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
    return sum + transactionTotal + transaction.shipping_cost;
  }, 0);

  // Calculate total estimated profit and ROI - including shipping costs
  const totalCost = transactions.reduce((sum, transaction) => {
    const transactionTotal = transactionItems
      .filter(item => item.transaction_id === transaction.id)
      .reduce((itemSum, item) => itemSum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
    return sum + transactionTotal + transaction.shipping_cost;
  }, 0);
  
  const totalRevenue = transactionItems.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
  const totalEstimatedProfit = totalRevenue - totalCost;
  const averageROI = totalCost > 0 ? (totalEstimatedProfit / totalCost) * 100 : 0;

  // Calculate budget remaining
  const budgetAmount = currentBudget?.amount || 0;
  const budgetRemaining = budgetAmount - monthlySpend;

  // Calculate pending orders
  const pendingOrders = transactions.filter(t => 
    t.status === 'ordered' || t.status === 'in transit' || t.status === 'collected' || t.status === 'partially received'
  ).length;

  // Calculate on-time delivery rate
  const deliveredTransactions = transactions.filter(t => t.status === 'fully received');
  const onTimeDeliveries = deliveredTransactions.filter(t => {
    if (!t.ordered_date || !t.delivery_date) return false;
    // Assume 7 days is the expected delivery time
    const orderDate = new Date(t.ordered_date);
    const deliveryDate = new Date(t.delivery_date);
    const expectedDeliveryDate = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return deliveryDate <= expectedDeliveryDate;
  });
  const onTimeDeliveryRate = deliveredTransactions.length > 0 ? 
    (onTimeDeliveries.length / deliveredTransactions.length) * 100 : 0;

  return {
    totalOrders,
    totalStockOrdered,
    totalEstimatedProfit,
    monthlySpend,
    averageROI,
    budgetRemaining,
    pendingOrders,
    onTimeDeliveryRate
  };
};

// Supplier Metrics
export const getSupplierMetrics = async (): Promise<SupplierMetrics[]> => {
  const [suppliers, transactions, transactionItems] = await Promise.all([
    getSuppliers(),
    getTransactions(),
    getTransactionItems()
  ]);

  return suppliers.map(supplier => {
    const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
    const orderCount = supplierTransactions.length;

    // Calculate total spend for this supplier including fees AND shipping
    const totalSpend = supplierTransactions.reduce((sum, transaction) => {
      const transactionTotal = transactionItems
        .filter(item => item.transaction_id === transaction.id)
        .reduce((itemSum, item) => itemSum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
      return sum + transactionTotal + transaction.shipping_cost;
    }, 0);

    // Calculate estimated profit for this supplier including shipping costs
    const supplierItems = transactionItems.filter(item => 
      supplierTransactions.some(t => t.id === item.transaction_id)
    );
    const itemsCost = supplierItems.reduce((sum, item) => sum + ((item.buy_price + (item.est_fees || 0)) * item.quantity), 0);
    const shippingCost = supplierTransactions.reduce((sum, t) => sum + t.shipping_cost, 0);
    const totalCost = itemsCost + shippingCost;
    const totalRevenue = supplierItems.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
    const estimatedProfit = totalRevenue - totalCost;

    // Calculate ROI
    const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

    // Calculate average order value
    const averageOrderValue = orderCount > 0 ? totalSpend / orderCount : 0;

    // Find last order date
    const lastOrderDate = supplierTransactions.length > 0 ? 
      supplierTransactions
        .filter(t => t.ordered_date)
        .sort((a, b) => new Date(b.ordered_date!).getTime() - new Date(a.ordered_date!).getTime())[0]?.ordered_date || null
      : null;

    return {
      supplier,
      orderCount,
      totalSpend,
      estimatedProfit,
      roi,
      averageOrderValue,
      lastOrderDate
    };
  }).sort((a, b) => b.orderCount - a.orderCount); // Sort by order count descending
};