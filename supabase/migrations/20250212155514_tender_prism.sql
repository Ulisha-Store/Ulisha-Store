/*
  # Fix Database Issues

  1. Add missing indexes
  2. Add missing constraints
  3. Add missing triggers
*/

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_new_session_id ON cart_items_new(session_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Add missing constraints
ALTER TABLE orders 
ADD CONSTRAINT check_total_positive 
CHECK (total >= 0);

ALTER TABLE order_items 
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity > 0);

ALTER TABLE cart_items_new 
ADD CONSTRAINT check_cart_quantity_positive 
CHECK (quantity > 0);

-- Add trigger to update order total when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total = (
    SELECT COALESCE(SUM(quantity * price), 0)
    FROM order_items
    WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_total_trigger ON order_items;
CREATE TRIGGER update_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();