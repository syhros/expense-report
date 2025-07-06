/*
  # Add historical pricing data table

  1. New Tables
    - `asin_pricing_history`
      - `id` (uuid, primary key)
      - `asin` (text, required)
      - `buy_price` (numeric, required)
      - `sell_price` (numeric, required)
      - `est_fees` (numeric, required)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on asin_pricing_history table
    - Add policy for authenticated users to manage their own data
    - Create indexes for performance optimization
*/

-- Create asin_pricing_history table
CREATE TABLE IF NOT EXISTS asin_pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text NOT NULL,
  buy_price numeric(10,2) NOT NULL,
  sell_price numeric(10,2) NOT NULL,
  est_fees numeric(10,2) NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE asin_pricing_history ADD CONSTRAINT asin_pricing_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE asin_pricing_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for asin_pricing_history
CREATE POLICY "Users can manage their own asin pricing history"
  ON asin_pricing_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_user_id ON asin_pricing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_asin ON asin_pricing_history(asin);
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_created_at ON asin_pricing_history(created_at);