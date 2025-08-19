-- Prevent Double Voting
-- This migration adds constraints to prevent users from voting multiple times in the same election

-- Add unique constraint to prevent double voting in votes table
ALTER TABLE votes 
ADD CONSTRAINT unique_voter_election 
UNIQUE (voter_id, election_id);

-- Add unique constraint to prevent double voting in encrypted_votes table
ALTER TABLE encrypted_votes 
ADD CONSTRAINT unique_encrypted_voter_election 
UNIQUE (voter_id, election_id);

-- Add check constraint to ensure vote integrity
ALTER TABLE votes 
ADD CONSTRAINT check_vote_integrity 
CHECK (voter_id IS NOT NULL AND election_id IS NOT NULL AND candidate_id IS NOT NULL);

-- Indexes already created in main migration

-- Function to check if user has already voted
CREATE OR REPLACE FUNCTION has_user_voted(user_uuid UUID, election_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    vote_exists BOOLEAN;
BEGIN
    -- Check in votes table
    SELECT EXISTS(
        SELECT 1 FROM votes 
        WHERE voter_id = user_uuid AND election_id = election_uuid
    ) INTO vote_exists;
    
    -- If not found in votes, check in encrypted_votes
    IF NOT vote_exists THEN
        SELECT EXISTS(
            SELECT 1 FROM encrypted_votes 
            WHERE voter_id = user_uuid AND election_id = election_uuid
        ) INTO vote_exists;
    END IF;
    
    RETURN vote_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's vote receipt
CREATE OR REPLACE FUNCTION get_user_vote_receipt(user_uuid UUID, election_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    receipt_id TEXT;
BEGIN
    -- Try to get from votes table first
    SELECT id::TEXT INTO receipt_id
    FROM votes 
    WHERE voter_id = user_uuid AND election_id = election_uuid
    LIMIT 1;
    
    -- If not found, try encrypted_votes
    IF receipt_id IS NULL THEN
        SELECT id::TEXT INTO receipt_id
        FROM encrypted_votes 
        WHERE voter_id = user_uuid AND election_id = election_uuid
        LIMIT 1;
    END IF;
    
    RETURN receipt_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION has_user_voted(UUID, UUID) IS 'Check if a user has already voted in a specific election';
COMMENT ON FUNCTION get_user_vote_receipt(UUID, UUID) IS 'Get the vote receipt ID for a user in a specific election';
COMMENT ON CONSTRAINT unique_voter_election ON votes IS 'Prevents double voting in the same election';
COMMENT ON CONSTRAINT unique_encrypted_voter_election ON encrypted_votes IS 'Prevents double voting in encrypted votes table'; 