/*
  # Add director_name column to general_ledger table

  1. Changes
    - Add `director_name` column to `general_ledger` table
    - Set as nullable text field for storing director names in Director's loan transactions
  
  2. Details
    - Column type is text to store director names
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
    - Nullable to allow for non-Director's loan transactions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'general_ledger' AND column_name = 'director_name'
  ) THEN
    ALTER TABLE general_ledger ADD COLUMN director_name text;
  END IF;
END $$;