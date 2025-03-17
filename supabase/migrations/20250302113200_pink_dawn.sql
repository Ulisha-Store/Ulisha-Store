/*
  # Product enhancements

  1. Additional product images
    - Ensures the product_images table exists for storing multiple images per product
  
  2. Delivery information
    - Ensures delivery information columns exist in the orders table
    
  3. Security
    - Adds appropriate RLS policies for product_images table
*/

-- Create product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add delivery information to orders if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_address text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_name text;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' AND policyname = 'Anyone can view product images'
  ) THEN
    CREATE POLICY "Anyone can view product images"
      ON product_images
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' AND policyname = 'Only admins can manage product images'
  ) THEN
    CREATE POLICY "Only admins can manage product images"
      ON product_images
      FOR ALL
      TO authenticated
      USING (auth.email() = 'paulelite606@gmail.com')
      WITH CHECK (auth.email() = 'paulelite606@gmail.com');
  END IF;
END $$;

-- Add index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);