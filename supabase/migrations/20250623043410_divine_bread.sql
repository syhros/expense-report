/*
  # Add missing columns to suppliers table

  1. Changes
    - Add `site` column to suppliers table for website URLs
    - Add `notes` column to suppliers table for additional notes
  
  2. Details
    - Both columns are optional (nullable) with empty string defaults
    - Uses IF NOT EXISTS pattern to prevent errors if columns already exist
*/

-- Add site column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'site'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN site text DEFAULT ''::text;
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes text DEFAULT ''::text;
  END IF;
END $$;