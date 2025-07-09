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
  title: string | null;
  brand: string | null;
  image_url: string | null;
  type: string;
  pack: number;
  shipped: number;
  category: string;
  weight: number;
  weight_unit: string;
  user_id: string;
  fnsku: string | null;
  created_at: string;
  updated_at: string;
}

// Shipping-related interfaces
export interface Shipment {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  total_asins: number;
  total_units: number;
  total_weight: number;
}

export interface PackGroup {
  id: string;
  shipment_id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  total_boxes: number;
  total_units: number;
  total_weight: number;
}

export interface Box {
  id: string;
  pack_group_id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  weight: number;
  width: number;
  length: number;
  height: number;
  total_units: number;
}

export interface PackGroupItem {
  id: string;
  pack_group_id: string;
  asin: string;
  sku: string;
  title: string;
  prep_type: string;
  expected_quantity: number;
  boxed_quantities: { [boxId: string]: number };
  user_id: string;
  created_at: string;
  updated_at: string;
  order_index: number;
}

// Extended interfaces for UI components
export interface PackGroupItemWithASINDetails extends PackGroupItem {
  asin_details?: ASIN;
  total_boxed: number;
  remaining: number;
  total_weight: number;
}

export interface BoxWithItems extends Box {
  items: PackGroupItemWithASINDetails[];
}

export interface PackGroupWithDetails extends PackGroup {
  boxes: BoxWithItems[];
  items: PackGroupItemWithASINDetails[];
}

export interface ShipmentWithDetails extends Shipment {
  pack_groups: PackGroupWithDetails[];
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
  is_directors_loan?: boolean;
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

export interface GeneralLedgerTransaction {
  id: string;
  date: string;
  category: string;
  reference: string;
  type: string;
  amount: number;
  payment_method: string;
  status: string;
  director_name?: string;
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
  averageFees?: number;
  averageSellPrice?: number;
  averageProfit: number;
  totalQuantity: number;
  adjustedQuantity: number;
  orderedQuantity?: number;
  stored: number;
}

export interface TransactionWithMetrics extends Transaction {
  totalCost: number;
  estimatedProfit: number;
  roi: number;
  isDirectorsLoan: boolean;
  items?: TransactionItemDisplay[];
}

export interface TransactionItemDisplay extends TransactionItem {
  asin_details?: ASIN;
  totalCost: number;
  estimatedProfit: number;
  roi: number;
  displayQuantity: number; // Adjusted for bundles
}