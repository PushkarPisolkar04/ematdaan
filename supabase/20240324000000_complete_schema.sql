-- Drop existing tables if they exist
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS elections;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admin_addresses;

-- Create admin_addresses table
CREATE TABLE admin_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create elections table
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    total_votes INTEGER DEFAULT 0,
    total_registered INTEGER DEFAULT 0,
    encryption_keys JSONB DEFAULT '{
        "publicKey": {
            "n": "",
            "g": ""
        },
        "privateKey": {
            "lambda": "",
            "mu": "",
            "n": ""
        }
    }',
    merkle_root TEXT,
    blockchain_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    party TEXT NOT NULL,
    symbol TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    did TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    has_voted BOOLEAN DEFAULT false,
    vote_receipt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_did TEXT NOT NULL REFERENCES users(did) ON DELETE CASCADE,
    encrypted_vote TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    merkle_proof JSONB DEFAULT '{
        "root": "",
        "proof": [],
        "leaf": "",
        "index": 0
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(election_id, voter_did)
);

-- Create indexes for better query performance
CREATE INDEX idx_elections_is_active ON elections(is_active);
CREATE INDEX idx_candidates_election_id ON candidates(election_id);
CREATE INDEX idx_votes_election_id ON votes(election_id);
CREATE INDEX idx_votes_voter_did ON votes(voter_did);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_addresses_updated_at
    BEFORE UPDATE ON admin_addresses
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

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE admin_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Admin addresses policies
CREATE POLICY "Allow public read access to admin_addresses"
    ON admin_addresses FOR SELECT
    TO public
    USING (true);

-- Elections policies
DROP POLICY IF EXISTS "Allow public read access to elections" ON elections;
DROP POLICY IF EXISTS "Allow admin insert to elections" ON elections;
DROP POLICY IF EXISTS "Allow admin update to elections" ON elections;

CREATE POLICY "Enable read access for all users" ON elections 
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON elections 
    FOR INSERT USING (true);

CREATE POLICY "Enable update for all users" ON elections 
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON elections 
    FOR DELETE USING (true);

-- Candidates policies
CREATE POLICY "Allow public read access to candidates"
    ON candidates FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow admin insert to candidates"
    ON candidates FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_addresses
            WHERE address = auth.jwt()->>'sub'
        )
    );

CREATE POLICY "Allow admin update to candidates"
    ON candidates FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_addresses
            WHERE address = auth.jwt()->>'sub'
        )
    );

-- Users policies
CREATE POLICY "Allow users to read own data"
    ON users FOR SELECT
    TO authenticated
    USING (address = auth.jwt()->>'sub');

CREATE POLICY "Allow users to insert own data"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (address = auth.jwt()->>'sub');

CREATE POLICY "Allow users to update own data"
    ON users FOR UPDATE
    TO authenticated
    USING (address = auth.jwt()->>'sub');

-- Votes policies
CREATE POLICY "Allow public read access to votes count"
    ON votes FOR SELECT
    TO public
    USING (true);

-- Drop existing policies first
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON votes;
DROP POLICY IF EXISTS "Enable insert for eligible voters" ON votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;
DROP POLICY IF EXISTS "Enable read access for all users" ON votes;

-- Create single, clear insert policy
CREATE POLICY "enable_vote_insert" ON votes
FOR INSERT TO authenticated
WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.did = votes.voter_did
        AND users.address = auth.jwt()->>'sub'
        AND NOT EXISTS (
            SELECT 1 FROM votes v
            WHERE v.voter_did = votes.voter_did
            AND v.election_id = votes.election_id
        )
    )
);

-- Create clear select policy
CREATE POLICY "enable_vote_select" ON votes
FOR SELECT TO authenticated
USING (
    voter_did IN (
        SELECT users.did
        FROM users
        WHERE users.address = auth.jwt()->>'sub'
    )
    OR EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
    )
);

-- Create policy for merkle proof updates
CREATE POLICY "enable_merkle_updates" ON votes
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
    (OLD.merkle_proof IS NULL AND NEW.merkle_proof IS NOT NULL)
    OR (OLD.merkle_proof->>'root' IS NULL AND NEW.merkle_proof->>'root' IS NOT NULL)
);

-- Create function to increment candidate votes
CREATE OR REPLACE FUNCTION increment_candidate_votes(
    p_candidate_id UUID,
    p_election_id UUID
) RETURNS void AS $$
BEGIN
    -- Update candidate votes
    UPDATE candidates
    SET votes = votes + 1
    WHERE id = p_candidate_id
    AND election_id = p_election_id;

    -- Update election total votes
    UPDATE elections
    SET total_votes = total_votes + 1
    WHERE id = p_election_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has voted in an election
CREATE OR REPLACE FUNCTION has_voted_in_election(
    p_voter_did TEXT,
    p_election_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_voted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM votes
        WHERE voter_did = p_voter_did
        AND election_id = p_election_id
    ) INTO v_has_voted;
    
    RETURN v_has_voted;
END;
$$ LANGUAGE plpgsql;

-- Create function to update total registered voters
CREATE OR REPLACE FUNCTION update_total_registered()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_registered in active election
    UPDATE elections
    SET total_registered = (SELECT COUNT(*) FROM users)
    WHERE is_active = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update total_registered when users are added/removed
CREATE TRIGGER update_election_total_registered
    AFTER INSERT OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_total_registered(); 