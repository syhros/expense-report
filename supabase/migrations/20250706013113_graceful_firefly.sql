/*
  # Update ASINs table to track inventory separately

  1. Changes
    - Add `inventory` column to asins table to track inventory separately from shipped items
    - This allows for more accurate inventory tracking based on transaction status
  
  2. Details
    - Column type is integer with default 0
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asins' AND column_name = 'inventory'
  ) THEN
    ALTER TABLE asins ADD COLUMN inventory integer DEFAULT 0;
  END IF;
END $$;