/*
  # Complete FBA Tracker Database Schema

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `address` (text, optional)
      - `email` (text, optional)
      - `phone` (text, optional)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `asins`
      - `id` (uuid, primary key)
      - `asin` (text, required)
      - `title` (text, optional)
      - `brand` (text, optional)
      - `image_url` (text, optional)
      - `type` (text, optional)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `ordered_date` (date)
      - `delivery_date` (date)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `po_number` (text, optional)
      - `category` (text, optional)
      - `payment_method` (text, optional)
      - `status` (text, default 'pending')
      - `shipping_cost` (decimal)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transaction_items`
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, foreign key to transactions)
      - `asin` (text, required)
      - `quantity` (integer)
      - `buy_price` (decimal)
      - `sell_price` (decimal)
      - `created_at` (timestamp)
    
    - `budgets`
      - `id` (uuid, primary key)
      - `month` (integer, 1-12)
      - `year` (integer)
      - `amount` (decimal)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `amazon_transactions`
      - `id` (uuid, primary key)
      - `date` (date)
      - `transaction_status` (text)
      - `transaction_type` (text)
      - `order_id` (text)
      - `product_details` (text)
      - `total_product_charges` (decimal)
      - `total_promotional_rebates` (decimal)
      - `amazon_fees` (decimal)
      - `other` (decimal)
      - `total` (decimal)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Create indexes for performance optimization

  3. Triggers
    - Auto-update `updated_at` columns on record changes
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create asins table
CREATE TABLE IF NOT EXISTS asins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text NOT NULL,
  title text DEFAULT '',
  brand text DEFAULT '',
  image_url text DEFAULT '',
  type text DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordered_date date,
  delivery_date date,
  supplier_id uuid,
  po_number text DEFAULT '',
  category text DEFAULT '',
  payment_method text DEFAULT '',
  status text DEFAULT 'pending',
  shipping_cost numeric(10,2) DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  asin text NOT NULL,
  quantity integer DEFAULT 0,
  buy_price numeric(10,2) DEFAULT 0,
  sell_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  amount numeric(10,2) DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create amazon_transactions table
CREATE TABLE IF NOT EXISTS amazon_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  transaction_status text DEFAULT '',
  transaction_type text DEFAULT '',
  order_id text DEFAULT '',
  product_details text DEFAULT '',
  total_product_charges numeric(10,2) DEFAULT 0,
  total_promotional_rebates numeric(10,2) DEFAULT 0,
  amazon_fees numeric(10,2) DEFAULT 0,
  other numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key for suppliers.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'suppliers_user_id_fkey'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for asins.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asins_user_id_fkey'
  ) THEN
    ALTER TABLE asins ADD CONSTRAINT asins_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for transactions.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_user_id_fkey'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for transactions.supplier_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_supplier_id_fkey'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_supplier_id_fkey 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for transaction_items.transaction_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transaction_items_transaction_id_fkey'
  ) THEN
    ALTER TABLE transaction_items ADD CONSTRAINT transaction_items_transaction_id_fkey 
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for budgets.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budgets_user_id_fkey'
  ) THEN
    ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for amazon_transactions.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'amazon_transactions_user_id_fkey'
  ) THEN
    ALTER TABLE amazon_transactions ADD CONSTRAINT amazon_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraints
DO $$
BEGIN
  -- Add unique constraint for asins (asin, user_id) if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asins_asin_user_id_key'
  ) THEN
    ALTER TABLE asins ADD CONSTRAINT asins_asin_user_id_key UNIQUE (asin, user_id);
  END IF;

  -- Add unique constraint for budgets (month, year, user_id) if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'budgets_month_year_user_id_key'
  ) THEN
    ALTER TABLE budgets ADD CONSTRAINT budgets_month_year_user_id_key UNIQUE (month, year, user_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers
CREATE POLICY "Users can manage their own suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for asins
CREATE POLICY "Users can manage their own asins"
  ON asins
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for transactions
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for transaction_items
CREATE POLICY "Users can manage their own transaction items"
  ON transaction_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  );

-- Create RLS policies for budgets
CREATE POLICY "Users can manage their own budgets"
  ON budgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for amazon_transactions
CREATE POLICY "Users can manage their own amazon transactions"
  ON amazon_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_asins_user_id ON asins(user_id);
CREATE INDEX IF NOT EXISTS idx_asins_asin ON asins(asin);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_amazon_transactions_user_id ON amazon_transactions(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$
BEGIN
  -- Drop existing triggers if they exist and recreate them
  DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
  CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_asins_updated_at ON asins;
  CREATE TRIGGER update_asins_updated_at 
    BEFORE UPDATE ON asins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
  CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
  CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;