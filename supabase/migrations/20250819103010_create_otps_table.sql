-- Create OTPs Table Migration
-- This migration ensures the OTPs table has all required columns

-- Add missing columns to existing OTPs table
ALTER TABLE otps 
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_otp ON otps(otp);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_verified ON otps(is_verified);
CREATE INDEX IF NOT EXISTS idx_otps_attempts ON otps(attempts);

-- Grant permissions on the OTPs table
GRANT ALL ON otps TO anon;
GRANT ALL ON otps TO authenticated;
GRANT ALL ON otps TO service_role;

-- Ensure RLS is disabled for OTPs table
ALTER TABLE otps DISABLE ROW LEVEL SECURITY; 