-- Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items_new;
  DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items_new;
END $$;

-- Create new policies with fixed permissions
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
      AND shopping_sessions.status = 'active'
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
      AND shopping_sessions.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_sessions
      WHERE shopping_sessions.id = cart_items_new.session_id
      AND shopping_sessions.user_id = auth.uid()
      AND shopping_sessions.status = 'active'
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

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_new_session_id ON cart_items_new(session_id);