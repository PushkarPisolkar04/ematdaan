-- Fix OTPs table permissions and ensure proper access
-- This migration ensures the OTPs table works correctly

-- Grant all permissions on the OTPs table
GRANT ALL ON otps TO anon;
GRANT ALL ON otps TO authenticated;
GRANT ALL ON otps TO service_role;

-- Ensure RLS is disabled for OTPs table
ALTER TABLE otps DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "otps_read" ON otps;
DROP POLICY IF EXISTS "otps_insert" ON otps;
DROP POLICY IF EXISTS "otps_update" ON otps;
DROP POLICY IF EXISTS "otps_delete" ON otps;

-- Create simple policies that allow all operations
CREATE POLICY "otps_all" ON otps FOR ALL USING (true) WITH CHECK (true);

-- Ensure the table structure is correct
ALTER TABLE otps 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS otp TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'otps_pkey'
    ) THEN
        ALTER TABLE otps ADD PRIMARY KEY (id);
    END IF;
END $$; 