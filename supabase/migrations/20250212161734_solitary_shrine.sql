/*
  # Update Product References

  1. Changes
    - Safely modify product references in cart_items and order_items tables
    - Add proper foreign key constraints
    - Ensure data consistency with proper column existence checks

  2. Safety Measures
    - Check for both table and column existence before modifications
    - Use safe column type conversions
    - Add CASCADE on delete for referential integrity
*/

DO $$ 
BEGIN
  -- For cart_items table
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'cart_items'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cart_items'
    AND column_name = 'product_id'
  ) THEN
    -- Safely convert the column type
    ALTER TABLE cart_items
    ALTER COLUMN product_id TYPE uuid USING (product_id::uuid);
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_cart_items_product'
    ) THEN
      ALTER TABLE cart_items
      ADD CONSTRAINT fk_cart_items_product
      FOREIGN KEY (product_id) 
      REFERENCES products(id)
      ON DELETE CASCADE;
    END IF;
  END IF;

  -- For order_items table
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'order_items'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_items'
    AND column_name = 'product_id'
  ) THEN
    -- Safely convert the column type
    ALTER TABLE order_items
    ALTER COLUMN product_id TYPE uuid USING (product_id::uuid);
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_order_items_product'
    ) THEN
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_product
      FOREIGN KEY (product_id) 
      REFERENCES products(id)
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;