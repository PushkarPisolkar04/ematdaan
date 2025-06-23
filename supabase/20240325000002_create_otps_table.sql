-- Create OTPs table
CREATE TABLE IF NOT EXISTS otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- Enable Row Level Security
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert access for authenticated users" ON otps
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON otps
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        auth.email() = email
    );

CREATE POLICY "Enable delete access for authenticated users" ON otps
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        auth.email() = email
    );

-- Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM otps WHERE expires_at < now();
END;
$$;

-- Create a cron job to clean up expired OTPs every hour
SELECT cron.schedule(
    'cleanup-expired-otps',
    '0 * * * *', -- Every hour
    'SELECT cleanup_expired_otps();'
); 