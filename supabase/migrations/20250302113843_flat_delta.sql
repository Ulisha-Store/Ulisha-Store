/*
  # Fix Cart RLS Policies

  1. Security
    - Updates RLS policies for cart_items_new table to fix permission issues
    - Ensures authenticated users can properly add items to their cart
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