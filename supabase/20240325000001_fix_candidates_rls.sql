-- Drop existing policies for candidates table
DROP POLICY IF EXISTS "Enable read access for all users" ON candidates;
DROP POLICY IF EXISTS "Enable write access for admin only" ON candidates;
DROP POLICY IF EXISTS "Allow public read access to candidates" ON candidates;
DROP POLICY IF EXISTS "Allow admin insert to candidates" ON candidates;
DROP POLICY IF EXISTS "Allow admin update to candidates" ON candidates;
DROP POLICY IF EXISTS "Enable insert for all users" ON candidates;
DROP POLICY IF EXISTS "Enable update for all users" ON candidates;
DROP POLICY IF EXISTS "Enable delete for all users" ON candidates;
DROP POLICY IF EXISTS "Anyone can read candidates" ON candidates;
DROP POLICY IF EXISTS "Admins can manage candidates" ON candidates;

-- Create new RLS policies for candidates
CREATE POLICY "Enable read for all"
ON candidates FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON candidates FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users"
ON candidates FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users"
ON candidates FOR DELETE
USING (auth.role() = 'authenticated');

-- Make sure RLS is enabled
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY; 