/*
  # Add payment fields to orders table

  1. Changes
    - Add payment_ref column to orders table to store transaction references
    - Add payment_method column to orders table to track payment method used
  
  2. Purpose
    - Enable tracking of payment transactions from Flutterwave
    - Support multiple payment methods (direct, flutterwave, etc.)
*/

-- Add payment reference column to orders table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_ref'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_ref text;
  END IF;
END $$;

-- Add payment method column to orders table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;
END $$;

-- Add index for better performance when searching by payment reference
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_ref);