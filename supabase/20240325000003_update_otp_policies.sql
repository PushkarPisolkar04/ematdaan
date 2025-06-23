-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON otps;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON otps;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON otps;
DROP POLICY IF EXISTS "Enable insert access for all users" ON otps;
DROP POLICY IF EXISTS "Enable read access for matching email" ON otps;
DROP POLICY IF EXISTS "Enable delete access for matching email" ON otps;

-- Create new policies that don't require authentication for OTP operations
CREATE POLICY "Enable insert for OTP" ON otps
    FOR INSERT TO PUBLIC
    WITH CHECK (true);

CREATE POLICY "Enable select for OTP verification" ON otps
    FOR SELECT TO PUBLIC
    USING (true);

CREATE POLICY "Enable delete for OTP cleanup" ON otps
    FOR DELETE TO PUBLIC
    USING (true);

-- Add unique constraint to prevent multiple active OTPs for same email
ALTER TABLE otps DROP CONSTRAINT IF EXISTS unique_active_otp;
ALTER TABLE otps
    ADD CONSTRAINT unique_active_otp 
    UNIQUE (email);

-- Add index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_otps_email_otp ON otps(email, otp);

-- Add function to automatically delete expired OTPs
CREATE OR REPLACE FUNCTION delete_expired_otps() RETURNS void AS $$
BEGIN
    DELETE FROM otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup of expired OTPs (runs every 5 minutes)
SELECT cron.schedule(
    'cleanup-expired-otps',
    '*/5 * * * *',
    $$SELECT delete_expired_otps();$$
); 