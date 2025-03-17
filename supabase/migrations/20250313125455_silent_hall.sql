-- Drop old notification function and trigger
DROP TRIGGER IF EXISTS order_email_notification_trigger ON orders;
DROP FUNCTION IF EXISTS notify_admin_on_order();

-- Create simplified notification function
CREATE OR REPLACE FUNCTION notify_admin_on_order()
RETURNS TRIGGER AS $$
DECLARE
  order_items_json JSONB;
  whatsapp_message TEXT;
  item_record RECORD;
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
  
  -- Create WhatsApp message
  whatsapp_message := '🛍️ *New Order Received!*' || E'\n\n' ||
    '*Order ID:* ' || substring(NEW.id::text, 1, 8) || E'\n' ||
    '*Date:* ' || to_char(NEW.created_at, 'YYYY-MM-DD HH:MI:SS') || E'\n' ||
    '*Customer:* ' || COALESCE(NEW.delivery_name, 'Not provided') || E'\n' ||
    '*Phone:* ' || COALESCE(NEW.delivery_phone, 'Not provided') || E'\n' ||
    '*Address:* ' || COALESCE(NEW.delivery_address, 'Not provided') || E'\n' ||
    '*Total:* NGN ' || NEW.total || E'\n\n' ||
    '*Payment Method:* ' || COALESCE(NEW.payment_method, 'Not provided') || E'\n' ||
    '*Payment Reference:* ' || COALESCE(NEW.payment_ref, 'Not provided') || E'\n\n' ||
    '*Order Items:*' || E'\n';

  -- Add order items to WhatsApp message
  FOR item_record IN 
    SELECT value->>'product_name' as product_name,
           value->>'quantity' as quantity,
           value->>'subtotal' as subtotal
    FROM jsonb_array_elements(order_items_json) as value
  LOOP
    whatsapp_message := whatsapp_message || 
      '• ' || item_record.product_name || 
      ' (×' || item_record.quantity || ') - NGN ' || 
      item_record.subtotal || E'\n';
  END LOOP;

  -- Send WhatsApp notification using WhatsApp Cloud API
  PERFORM http_post(
    'https://graph.facebook.com/v19.0/noABJ7Mn5VL9ai3SQDREeM8yx4ilcTohyUij7QmV228d58bd/messages',
    jsonb_build_object(
      'messaging_product', 'whatsapp',
      'to', '2347060438205@c.us',
      'type', 'text',
      'text', jsonb_build_object(
        'body', whatsapp_message
      )
    ),
    ARRAY[
      'Authorization: Bearer noABJ7Mn5VL9ai3SQDREeM8yx4ilcTohyUij7QmV228d58bd',
      'Content-Type: application/json'
    ]
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER order_notification_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_order();