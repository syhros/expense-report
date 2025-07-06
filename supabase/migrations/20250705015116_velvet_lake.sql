/*
  # Add est_fees column to transaction_items table

  1. Changes
    - Add `est_fees` column to transaction_items table for storing estimated fees
    - Set default value to 0 for consistency with other numeric fields
  
  2. Details
    - Column type is numeric(10,2) to match other price fields
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transaction_items' AND column_name = 'est_fees'
  ) THEN
    ALTER TABLE transaction_items ADD COLUMN est_fees numeric(10,2) DEFAULT 0;
  END IF;
END $$;