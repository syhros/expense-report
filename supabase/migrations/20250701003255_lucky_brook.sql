/*
  # Add General Ledger Table

  1. New Tables
    - `general_ledger`
      - `id` (uuid, primary key)
      - `date` (date, required)
      - `category` (text, required)
      - `reference` (text, optional)
      - `type` (text, required) - 'Income' or 'Expense'
      - `amount` (numeric, required) - positive for income, negative for expense
      - `status` (text, default 'pending')
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on general_ledger table
    - Add policy for authenticated users to manage their own data
    - Create index for performance optimization
*/

-- Create general_ledger table
CREATE TABLE IF NOT EXISTS general_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  category text NOT NULL,
  reference text DEFAULT '',
  type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE general_ledger ADD CONSTRAINT general_ledger_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for general_ledger
CREATE POLICY "Users can manage their own general ledger transactions"
  ON general_ledger
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_general_ledger_user_id ON general_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_date ON general_ledger(date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_category ON general_ledger(category);
CREATE INDEX IF NOT EXISTS idx_general_ledger_type ON general_ledger(type);