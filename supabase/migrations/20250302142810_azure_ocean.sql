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

-- Create product_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS if not already enabled
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for product_ratings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_ratings' AND policyname = 'Users can view all product ratings'
  ) THEN
    CREATE POLICY "Users can view all product ratings"
      ON product_ratings
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_ratings' AND policyname = 'Users can create their own ratings'
  ) THEN
    CREATE POLICY "Users can create their own ratings"
      ON product_ratings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_ratings' AND policyname = 'Users can update their own ratings'
  ) THEN
    CREATE POLICY "Users can update their own ratings"
      ON product_ratings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_ratings' AND policyname = 'Users can delete their own ratings'
  ) THEN
    CREATE POLICY "Users can delete their own ratings"
      ON product_ratings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON product_ratings(user_id);