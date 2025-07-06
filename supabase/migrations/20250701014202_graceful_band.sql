-- Add payment_method column to general_ledger table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'general_ledger' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE general_ledger ADD COLUMN payment_method text DEFAULT 'AMEX Plat';
  END IF;
END $$;