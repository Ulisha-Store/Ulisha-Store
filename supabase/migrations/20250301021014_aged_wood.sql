/*
  # Product and Order Enhancements
  
  1. New Tables
    - `product_images` - Stores additional images for products
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `image_url` (text)
      - `created_at` (timestamp)
  
  2. Changes
    - Add `delivery_address` column to orders table
    - Add `delivery_phone` column to orders table
    - Add `delivery_name` column to orders table
  
  3. Security
    - Enable RLS on new tables
    - Add policies for product images
*/

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add delivery information to orders
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

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images
CREATE POLICY "Anyone can view product images"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (auth.email() = 'paulelite606@gmail.com')
  WITH CHECK (auth.email() = 'paulelite606@gmail.com');

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);