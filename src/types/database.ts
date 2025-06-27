export interface Supplier {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  site: string;
  notes: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ASIN {
  id: string;
  asin: string;
  title: string;
  brand: string;
  image_url: string;
  type: string;
  pack: number;
  shipped: number;
  category: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  ordered_date: string | null;
  delivery_date: string | null;
  supplier_id: string | null;
  po_number: string;
  category: string;
  payment_method: string;
  status: string;
  shipping_cost: number;
  notes: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  asin: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  created_at: string;
  est_fees: number;
}

export interface Budget {
  id: string;
  month: number;
  year: number;
  amount: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AmazonTransaction {
  id: string;
  date: string | null;
  transaction_status: string;
  transaction_type: string;
  order_id: string;
  product_details: string;
  total_product_charges: number;
  total_promotional_rebates: number;
  amazon_fees: number;
  other: number;
  total: number;
  avg_cog: number;
  user_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalStockOrdered: number;
  totalEstimatedProfit: number;
  monthlySpend: number;
  averageROI: number;
  budgetRemaining: number;
  pendingOrders: number;
  onTimeDeliveryRate: number;
}

export interface SupplierMetrics {
  supplier: Supplier;
  orderCount: number;
  totalSpend: number;
  estimatedProfit: number;
  roi: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
}

// Extended interfaces for calculated fields
export interface ASINWithMetrics extends ASIN {
  averageBuyPrice: number;
  totalQuantity: number;
  adjustedQuantity: number;
  stored: number;
}

export interface TransactionWithMetrics extends Transaction {
  totalCost: number;
  estimatedProfit: number;
  roi: number;
}

export interface TransactionItemDisplay extends TransactionItem {
  asin_details?: ASIN;
  totalCost: number;
  estimatedProfit: number;
  roi: number;
  displayQuantity: number; // Adjusted for bundles
}