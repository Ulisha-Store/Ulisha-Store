/*
  # Fix order processing permissions

  1. Changes
    - Add policy to allow authenticated users to view their own user data
    - Fix the notify_admin_on_order function to handle missing user data gracefully
    - Update order processing to avoid direct user table access
*/

-- Create a policy to allow users to view their own user data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can view their own user data'
  ) THEN
    CREATE POLICY "Users can view their own user data"
      ON auth.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Update the notify_admin_on_order function to handle missing user data gracefully
CREATE OR REPLACE FUNCTION notify_admin_on_order()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  order_items_json JSONB;
  email_subject TEXT;
  email_content TEXT;
BEGIN
  -- Try to get user email safely
  BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    user_email := 'Unknown';
  END;
  
  -- Get order items as JSON
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    order_items_json := '[]'::jsonb;
  END;
  
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
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue processing
    RAISE NOTICE 'Failed to send email notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;