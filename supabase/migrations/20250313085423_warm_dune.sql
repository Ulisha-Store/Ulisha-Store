/*
  # Fix Cart RLS Policies

  1. Changes
    - Update RLS policies for shopping_sessions and cart_items_new tables
    - Add proper cascading relationships
    - Fix permission issues for cart operations
    
  2. Security
    - Ensure authenticated users can manage their cart items
    - Maintain data isolation between users
*/

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own shopping sessions" ON shopping_sessions;
  DROP POLICY IF EXISTS "Users can manage their own shopping sessions" ON shopping_sessions;
  DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items_new;
END $$;

-- Create new policies for shopping_sessions
CREATE POLICY "Users can view their own shopping sessions"
  ON shopping_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own shopping sessions"
  ON shopping_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create new policies for cart_items_new
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_user_id ON shopping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_new_session_id ON cart_items_new(session_id);