-- First, drop all existing RLS policies for the elections table
DROP POLICY IF EXISTS "Enable read access for all users" ON elections;
DROP POLICY IF EXISTS "Enable write access for admin only" ON elections;
DROP POLICY IF EXISTS "Allow public read access to elections" ON elections;
DROP POLICY IF EXISTS "Allow admin insert to elections" ON elections;
DROP POLICY IF EXISTS "Allow admin update to elections" ON elections;
DROP POLICY IF EXISTS "Enable insert for all users" ON elections;
DROP POLICY IF EXISTS "Enable update for all users" ON elections;
DROP POLICY IF EXISTS "Enable delete for all users" ON elections;

-- Create new RLS policies for elections
CREATE POLICY "Enable read for all"
ON elections FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON elections FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users"
ON elections FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users"
ON elections FOR DELETE
USING (auth.role() = 'authenticated');

-- Make sure RLS is enabled
ALTER TABLE elections ENABLE ROW LEVEL SECURITY; 