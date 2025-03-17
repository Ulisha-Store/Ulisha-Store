/*
  # Add product ratings functionality

  1. New Tables
    - `product_ratings` - Stores user ratings for products
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products.id)
      - `user_id` (uuid, references auth.users.id)
      - `rating` (integer, 1-5 star rating)
      - `created_at` (timestamp)
  
  2. Changes
    - Add `rating` column to products table to store average rating
  
  3. Security
    - Enable RLS on product_ratings table
    - Add policies for authenticated users to manage their own ratings
*/

-- Add rating column to products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'rating'
  ) THEN
    ALTER TABLE products ADD COLUMN rating numeric DEFAULT 5;
  END IF;
END $$;

-- Create product_ratings table
CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for product_ratings
CREATE POLICY "Users can view all product ratings"
  ON product_ratings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON product_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON product_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON product_ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON product_ratings(user_id);