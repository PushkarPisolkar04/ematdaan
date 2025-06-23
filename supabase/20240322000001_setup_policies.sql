-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_elections_updated_at ON elections;
DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
DROP TRIGGER IF EXISTS update_votes_updated_at ON votes;
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON admin_profiles;

-- Drop existing function with CASCADE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing view if it exists
DROP VIEW IF EXISTS election_stats;

-- Create election_stats view
CREATE VIEW election_stats AS
WITH active_election AS (
  SELECT id, start_time 
  FROM elections 
  WHERE is_active = true 
  LIMIT 1
)
SELECT
  COUNT(DISTINCT u.id) as registered_voters,
  COALESCE(
    (SELECT (COUNT(DISTINCT v.id)::FLOAT / NULLIF((SELECT COUNT(DISTINCT u2.id) FROM users u2), 0) * 100)::NUMERIC(5,2)
    FROM votes v
    WHERE v.election_id = (SELECT id FROM active_election)),
    0
  ) as success_rate,
  COALESCE(
    (SELECT EXTRACT(EPOCH FROM AVG(AGE(v.timestamp, e2.start_time)))
    FROM votes v
    JOIN elections e2 ON v.election_id = e2.id
    WHERE v.election_id = (SELECT id FROM active_election)),
    0
  )::NUMERIC(5,2) as avg_confirmation_time,
  100 as security_score
FROM users u
CROSS JOIN active_election e;

-- Enable RLS
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON admin_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can read active elections" ON elections;
DROP POLICY IF EXISTS "Admins can manage elections" ON elections;
DROP POLICY IF EXISTS "Anyone can read candidates" ON candidates;
DROP POLICY IF EXISTS "Admins can manage candidates" ON candidates;
DROP POLICY IF EXISTS "Users can read their own votes" ON votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;

-- Create policies for admin_profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON admin_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON admin_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for users table
CREATE POLICY "Enable read access for all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for own data"
  ON users FOR UPDATE
  USING (auth.uid()::text = address);

-- Create policies for elections
CREATE POLICY "Anyone can read active elections"
  ON elections FOR SELECT
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage elections"
  ON elections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Create policies for candidates
CREATE POLICY "Anyone can read candidates"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage candidates"
  ON candidates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Create policies for votes
CREATE POLICY "Users can read their own votes"
  ON votes FOR SELECT
  USING (
    voter_did IN (
      SELECT did FROM users
      WHERE address = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT
  WITH CHECK (
    voter_did IN (
      SELECT did FROM users
      WHERE address = auth.uid()::text
    )
  );

-- Grant permissions
GRANT ALL ON admin_profiles TO authenticated;
GRANT ALL ON elections TO authenticated;
GRANT ALL ON candidates TO authenticated;
GRANT ALL ON votes TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT SELECT ON election_stats TO authenticated;

-- Insert default admin if not exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@ematdaan.com'  -- Replace with your admin email
  ) THEN
    INSERT INTO admin_profiles (user_id, is_admin)
    SELECT id, true
    FROM auth.users
    WHERE email = 'admin@ematdaan.com'  -- Replace with your admin email
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$; 