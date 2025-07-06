/*
  # Add categories table for transaction categories

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, optional)
      - `created_at` (timestamp)

  2. Data
    - Insert predefined categories for business expenses

  3. Security
    - Enable RLS on categories table
    - Add policy for all users to read categories
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for categories (read-only for all authenticated users)
CREATE POLICY "All users can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert predefined categories
INSERT INTO categories (name, description) VALUES
  ('Stock', 'Inventory and stock purchases'),
  ('Bank fees', 'Banking and financial service fees'),
  ('Bank interest paid', 'Interest payments on loans and credit'),
  ('Capital introduced', 'Capital investments into the business'),
  ('Vehicles', 'Vehicle purchases and major repairs'),
  ('Property or asset purchases', 'Real estate and major asset acquisitions'),
  ('Director''s loans', 'Loans to/from company directors'),
  ('Dividends', 'Dividend payments to shareholders'),
  ('Fuel', 'Fuel and energy costs'),
  ('Hotel and accommodation', 'Travel accommodation expenses'),
  ('Income', 'Business revenue and income'),
  ('Insurance', 'Business insurance premiums'),
  ('Loan repayments and interest', 'Loan payments and interest charges'),
  ('Business loans', 'Business loan proceeds'),
  ('Marketing costs', 'Advertising and marketing expenses'),
  ('Meals', 'Business meals and entertainment'),
  ('Office supplies', 'Office equipment and supplies'),
  ('Operational equipment', 'Equipment for business operations'),
  ('Miscellaneous expenses and income', 'Other business expenses and income'),
  ('Payments to subcontractors', 'Subcontractor and freelancer payments'),
  ('Phone and internet costs', 'Telecommunications expenses'),
  ('Professional fees', 'Legal, accounting, and consulting fees'),
  ('Rent', 'Office and warehouse rent'),
  ('Shipping and postage', 'Delivery and postal costs'),
  ('Software and IT expenses', 'Software licenses and IT costs'),
  ('Staff costs', 'Employee wages and benefits'),
  ('Taxes', 'Business taxes and duties'),
  ('Transfers', 'Internal transfers and movements'),
  ('Travel', 'Business travel expenses'),
  ('Utilities', 'Electricity, gas, water, and utilities'),
  ('Workplace expenses', 'General workplace and facility costs'),
  ('Vehicle maintenance', 'Vehicle servicing and maintenance')
ON CONFLICT (name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);