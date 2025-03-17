/*
  # Add order email notification functionality

  1. New Functions
    - `notify_admin_on_order` - Sends an email to admin when a new order is placed
  
  2. Triggers
    - Add trigger on orders table to call the notification function
*/

-- Create a function to send email notification to admin
CREATE OR REPLACE FUNCTION notify_admin_on_order()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  order_items_json JSONB;
  email_subject TEXT;
  email_content TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
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
                  'Email: ' || COALESCE(user_email, 'Not provided') || E'\n' ||
                  'Phone: ' || COALESCE(NEW.delivery_phone, 'Not provided') || E'\n' ||
                  'Address: ' || COALESCE(NEW.delivery_address, 'Not provided') || E'\n' ||
                  'Total: NGN ' || NEW.total || E'\n\n' ||
                  'Order Items:' || E'\n';
  
  -- Send email to admin
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer re_123456789"}',
    body := jsonb_build_object(
      'from', 'orders@ulishastore.com',
      'to', 'paulelite606@gmail.com',
      'subject', email_subject,
      'text', email_content
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to send email notification when order status changes to completed
DROP TRIGGER IF EXISTS order_email_notification_trigger ON orders;
CREATE TRIGGER order_email_notification_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_order();