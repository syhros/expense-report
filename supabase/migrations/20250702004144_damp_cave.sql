/*
  # Add txn_po field to general_ledger table

  1. Changes
    - Add `txn_po` column to general_ledger table for storing transaction/purchase order references
    - This field will be used when creating Director's Loan entries from purchase orders
  
  2. Details
    - Column type is text with default empty string
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'general_ledger' AND column_name = 'txn_po'
  ) THEN
    ALTER TABLE general_ledger ADD COLUMN txn_po text DEFAULT '';
  END IF;
END $$;