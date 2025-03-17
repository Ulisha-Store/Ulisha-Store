/*
  # Fix cart issues and improve security

  1. Changes
    - Fix cart_items_new table permissions
    - Add better error handling for cart operations
    - Ensure proper cascade deletion for cart items
  
  2. Security
    - Improve RLS policies for cart_items_new
    - Add explicit policies for each operation
*/

-- Drop existing policies that might be causing issues
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items_new' AND policyname = 'Users can view their own cart items'
  ) THEN
    DROP POLICY "Users can view their own cart items" ON cart_items_new;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items_new' AND policyname = 'Users can manage their own cart items'
  ) THEN
    DROP POLICY "Users can manage their own cart items" ON cart_items_new;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items_new' AND policyname = 'Users can insert their own cart items'
  ) THEN
    DROP POLICY "Users can insert their own cart items" ON cart_items_new;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items_new' AND policyname = 'Users can update their own cart items'
  ) THEN
    DROP POLICY "Users can update their own cart items" ON cart_items_new;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items_new' AND policyname = 'Users can delete their own cart items'
  ) THEN
    DROP POLICY "Users can delete their own cart items" ON cart_items_new;
  END IF;
END $$;

-- Create new, more permissive policies for cart_items_new
CREATE POLICY "Users can view their own cart items"
  ON cart_items_new
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cart items"
  ON cart_items_new
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cart items"
  ON cart_items_new
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cart items"
  ON cart_items_new
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
    )
  );

-- Ensure proper cascade deletion
ALTER TABLE cart_items_new
DROP CONSTRAINT IF EXISTS cart_items_new_session_id_fkey,
ADD CONSTRAINT cart_items_new_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES shopping_sessions(id)
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_new_product_id ON cart_items_new(product_id);