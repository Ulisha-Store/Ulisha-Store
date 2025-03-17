/*
  # Fix Shopping Sessions RLS Policies

  1. Changes
    - Update RLS policies for shopping_sessions table
    - Fix permission issues for new session creation
    - Add better error handling for session management
    
  2. Security
    - Maintain data isolation between users
    - Allow authenticated users to create their initial session
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own shopping sessions" ON shopping_sessions;
DROP POLICY IF EXISTS "Users can manage their own shopping sessions" ON shopping_sessions;

-- Create new, more permissive policies for shopping_sessions
CREATE POLICY "Users can view their own shopping sessions"
  ON shopping_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping sessions"
  ON shopping_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping sessions"
  ON shopping_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping sessions"
  ON shopping_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_user_id_status ON shopping_sessions(user_id, status);