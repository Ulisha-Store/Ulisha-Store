/*
  # Add app settings table for storing global configuration

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key)
      - `logo_url` (text)
      - `favicon_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text NOT NULL,
  favicon_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view app settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage app settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (auth.email() = 'paulelite606@gmail.com')
  WITH CHECK (auth.email() = 'paulelite606@gmail.com');

-- Insert default app settings with the new logo
INSERT INTO app_settings (logo_url, favicon_url)
VALUES (
  'https://lgopfgrszxebcoylyocp.supabase.co/storage/v1/object/public/app-assets/ulisha-logo.png',
  'https://lgopfgrszxebcoylyocp.supabase.co/storage/v1/object/public/app-assets/ulisha-favicon.png'
);