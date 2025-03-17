/*
  # Add stores table and update products schema

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `logo` (text, not null)
      - `banner` (text, not null)
      - `phone` (text, not null)
      - `address` (text, not null)
      - `user_id` (uuid, references auth.users, not null)
      - `created_at` (timestamptz, default now())

  2. Changes to Existing Tables
    - Add to `products` table:
      - `store_id` (uuid, references stores)
      - `seller_id` (uuid, references auth.users)
      - `seller_phone` (text)

  3. Security
    - Enable RLS on `stores` table
    - Add policies for authenticated users to manage their own stores
    - Add policies for public to view stores
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo text NOT NULL,
  banner text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add store-related columns to products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE products ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_id uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'seller_phone'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_phone text;
  END IF;
END $$;

-- Create storage bucket for store images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create policies for stores
CREATE POLICY "Users can view all stores"
  ON stores
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own stores"
  ON stores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores"
  ON stores
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage policies for store images
CREATE POLICY "Anyone can view store images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'store-images');

CREATE POLICY "Authenticated users can upload store images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-images');

CREATE POLICY "Users can update their own store images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own store images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);