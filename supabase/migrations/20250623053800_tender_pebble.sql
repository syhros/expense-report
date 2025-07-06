/*
  # Add notes column to transactions table

  1. Changes
    - Add `notes` column to `transactions` table as text field
    - Set default value to empty string for consistency
    - Make it nullable to allow for existing records

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE transactions ADD COLUMN notes text DEFAULT '' NULL;
  END IF;
END $$;