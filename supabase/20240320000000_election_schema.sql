-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create elections table
CREATE TABLE IF NOT EXISTS elections (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    party VARCHAR(255) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id BIGINT REFERENCES candidates(id) ON DELETE CASCADE,
    voter_did VARCHAR(255) NOT NULL,
    encrypted_vote TEXT NOT NULL,
    receipt_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(election_id, voter_did)
);

-- Add triggers for updated_at
CREATE TRIGGER update_elections_updated_at
    BEFORE UPDATE ON elections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Elections policies
CREATE POLICY "Enable read access for all users" ON elections 
FOR SELECT USING (true);

CREATE POLICY "Enable write access for admin only" ON elections
FOR ALL USING (current_setting('app.is_admin', true)::boolean);

-- Candidates policies
CREATE POLICY "Enable read access for all users" ON candidates 
FOR SELECT USING (true);

CREATE POLICY "Enable write access for admin only" ON candidates
FOR ALL USING (current_setting('app.is_admin', true)::boolean);

-- Votes policies
CREATE POLICY "Enable read access for all users" ON votes 
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON votes
FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_election_dates ON elections(start_time, end_time);
CREATE INDEX idx_election_active ON elections(is_active);
CREATE INDEX idx_candidate_election ON candidates(election_id);
CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_voter ON votes(voter_did); 