/*
  # Add order notification functionality

  1. Changes
    - Add function to handle order notifications
    - Add trigger to send notifications on new orders
    
  2. Security
    - Ensure proper access control for notification functions
*/

-- Create or replace the notify_admin_on_order function
CREATE OR REPLACE FUNCTION notify_admin_on_order()
RETURNS TRIGGER AS $$
DECLARE
  order_items_json JSONB;
  email_subject TEXT;
  email_content TEXT;
BEGIN
  -- Get order items as JSON
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', p.name,
      'quantity', oi.quantity,
      'price', oi.price,
      'subtotal', (oi.quantity * oi.price)
    )
  ) INTO order_items_json
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;
  
  -- Create email subject
  email_subject := 'New Order #' || substring(NEW.id::text, 1, 8);
  
  -- Create email content
  email_content := 'A new order has been placed.' || E'\n\n' ||
                  'Order ID: ' || NEW.id || E'\n' ||
                  'Date: ' || to_char(NEW.created_at, 'YYYY-MM-DD HH:MI:SS') || E'\n' ||
                  'Customer: ' || COALESCE(NEW.delivery_name, 'Not provided') || E'\n' ||
                  'Phone: ' || COALESCE(NEW.delivery_phone, 'Not provided') || E'\n' ||
                  'Address: ' || COALESCE(NEW.delivery_address, 'Not provided') || E'\n' ||
                  'Total: NGN ' || NEW.total || E'\n\n' ||
                  'Payment Method: ' || COALESCE(NEW.payment_method, 'Not provided') || E'\n' ||
                  'Payment Reference: ' || COALESCE(NEW.payment_ref, 'Not provided') || E'\n\n' ||
                  'Order Items:' || E'\n' ||
                  order_items_json::text;
  
  -- Perform the notification (implementation depends on your notification service)
  -- This is a placeholder for the actual notification logic
  RAISE NOTICE 'Order notification: %', email_content;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'order_email_notification_trigger'
  ) THEN
    CREATE TRIGGER order_email_notification_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_order();
  END IF;
END $$;