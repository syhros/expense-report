/*
  # Add missing fields to suppliers and asins tables

  1. New Fields
    - Add `site` and `notes` fields to suppliers table
    - Add `pack` and `shipped` fields to asins table
  
  2. Security
    - No changes to existing RLS policies needed
*/

-- Add missing fields to suppliers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'site'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN site text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Add missing fields to asins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asins' AND column_name = 'pack'
  ) THEN
    ALTER TABLE asins ADD COLUMN pack integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asins' AND column_name = 'shipped'
  ) THEN
    ALTER TABLE asins ADD COLUMN shipped integer DEFAULT 0;
  END IF;
END $$;