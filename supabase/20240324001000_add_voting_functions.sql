-- Create function to increment candidate votes
CREATE OR REPLACE FUNCTION increment_candidate_votes(
    p_candidate_id UUID,
    p_election_id UUID
) RETURNS void AS $$
BEGIN
    -- Update candidate votes atomically
    UPDATE candidates
    SET votes = votes + 1
    WHERE id = p_candidate_id
    AND election_id = p_election_id;

    -- Update election total votes atomically
    UPDATE elections
    SET total_votes = total_votes + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_election_id;

    -- Verify the updates
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update vote counts';
    END IF;
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