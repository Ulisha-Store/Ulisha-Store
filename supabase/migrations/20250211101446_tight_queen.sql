/*
  # New Cart System Implementation

  1. New Tables
    - `shopping_sessions`: Tracks active shopping sessions
    - `cart_items_new`: New implementation of cart items with additional features
    
  2. Changes
    - Introduces session-based shopping cart
    - Adds support for saved items
    - Includes price snapshot
    
  3. Security
    - Enable RLS on new tables
    - Add appropriate security policies
*/

-- Create shopping sessions table
CREATE TABLE IF NOT EXISTS shopping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  CONSTRAINT unique_active_session UNIQUE (user_id, status)
);

-- Create new cart items table
CREATE TABLE IF NOT EXISTS cart_items_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES shopping_sessions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  price_snapshot numeric NOT NULL,
  is_saved_for_later boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, product_id)
);

-- Enable RLS
ALTER TABLE shopping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items_new ENABLE ROW LEVEL SECURITY;

-- Policies for shopping sessions
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

-- Policies for new cart items
CREATE POLICY "Users can view their own cart items"
  ON cart_items_new
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shopping_sessions
    WHERE shopping_sessions.id = cart_items_new.session_id
    AND shopping_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own cart items"
  ON cart_items_new
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shopping_sessions
    WHERE shopping_sessions.id = cart_items_new.session_id
    AND shopping_sessions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM shopping_sessions
    WHERE shopping_sessions.id = cart_items_new.session_id
    AND shopping_sessions.user_id = auth.uid()
  ));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_shopping_sessions_updated_at
    BEFORE UPDATE ON shopping_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_new_updated_at
    BEFORE UPDATE ON cart_items_new
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();