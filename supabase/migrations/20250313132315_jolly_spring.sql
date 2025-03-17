-- Drop existing function and trigger
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
DROP FUNCTION IF EXISTS notify_admin_on_order();

-- Create a simpler notification function that just logs the order
CREATE OR REPLACE FUNCTION notify_admin_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Just log the order for now
  RAISE NOTICE 'New order received: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER order_notification_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_order();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);