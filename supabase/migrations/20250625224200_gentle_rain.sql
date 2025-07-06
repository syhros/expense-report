/*
  # Add avg_cog column to amazon_transactions table

  1. Changes
    - Add `avg_cog` column to amazon_transactions table for storing average cost of goods
    - Set default value to 0 for consistency with other numeric fields
  
  2. Details
    - Column type is numeric(10,2) to match other price fields
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amazon_transactions' AND column_name = 'avg_cog'
  ) THEN
    ALTER TABLE amazon_transactions ADD COLUMN avg_cog numeric(10,2) DEFAULT 0;
  END IF;
END $$;