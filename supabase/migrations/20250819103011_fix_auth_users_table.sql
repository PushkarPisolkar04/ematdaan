-- Fix auth_users table structure
-- This migration ensures the auth_users table has all required columns

-- Add missing columns to auth_users table if they don't exist
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'voter',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraints if they don't exist
DO $$ 
BEGIN
    -- Add role constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'auth_users_role_check'
    ) THEN
        ALTER TABLE auth_users ADD CONSTRAINT auth_users_role_check 
        CHECK (role IN ('voter', 'admin', 'org_owner'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_verified ON auth_users(is_verified);

-- Grant permissions on the auth_users table
GRANT ALL ON auth_users TO anon;
GRANT ALL ON auth_users TO authenticated;
GRANT ALL ON auth_users TO service_role;

-- Ensure RLS is disabled for auth_users table
ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY; 