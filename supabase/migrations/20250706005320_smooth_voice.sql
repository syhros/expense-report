/*
  # Fix ASIN Pricing History Table

  1. Changes
    - Ensure asin_pricing_history table exists with correct structure
    - Add proper indexes for efficient querying
    - Set up RLS policies for security
  
  2. Details
    - This migration ensures the table exists even if previous migrations failed
    - Adds proper constraints and indexes for performance
*/

-- Create asin_pricing_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS asin_pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text NOT NULL,
  buy_price numeric(10,2) NOT NULL,
  sell_price numeric(10,2) NOT NULL,
  est_fees numeric(10,2) NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asin_pricing_history_user_id_fkey'
  ) THEN
    ALTER TABLE asin_pricing_history ADD CONSTRAINT asin_pricing_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE asin_pricing_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own asin pricing history" ON asin_pricing_history;

-- Create RLS policy for asin_pricing_history
CREATE POLICY "Users can manage their own asin pricing history"
  ON asin_pricing_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_user_id ON asin_pricing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_asin ON asin_pricing_history(asin);
CREATE INDEX IF NOT EXISTS idx_asin_pricing_history_created_at ON asin_pricing_history(created_at);