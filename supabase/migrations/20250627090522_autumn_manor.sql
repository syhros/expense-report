/*
  # Add category column to ASINs table

  1. Changes
    - Add `category` column to `asins` table
    - Set default value to 'Stock' for existing records
    - Make it required for new records with 'Stock' as default
  
  2. Details
    - Column type is text to match categories table
    - Uses IF NOT EXISTS pattern to prevent errors if column already exists
    - Updates existing records to have 'Stock' category
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asins' AND column_name = 'category'
  ) THEN
    ALTER TABLE asins ADD COLUMN category text DEFAULT 'Stock' NOT NULL;
  END IF;
END $$;

-- Update any existing records to have 'Stock' category
UPDATE asins SET category = 'Stock' WHERE category IS NULL OR category = '';