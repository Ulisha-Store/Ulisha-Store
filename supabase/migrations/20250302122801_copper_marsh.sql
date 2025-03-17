/*
  # Add user count function

  1. New Functions
    - `get_user_count` - A secure way to count users without direct table access
  
  2. Changes
    - Creates a database function that can be called via RPC to get the user count
    - Avoids permission issues with direct access to auth.users table
*/

-- Create a function to safely get user count
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM auth.users;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_count() TO authenticated;