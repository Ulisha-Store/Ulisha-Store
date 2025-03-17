/*
  # Fix Admin Page Relations

  1. Changes
    - Update stores table foreign key relationship
    - Fix products relationship with stores
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update stores table foreign key if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE table_name = 'products' 
    AND constraint_name = 'products_store_id_fkey'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_store_id_fkey
    FOREIGN KEY (store_id) 
    REFERENCES stores(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);