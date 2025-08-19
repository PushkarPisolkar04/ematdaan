-- Final Database Optimization
-- This migration adds essential constraints and indexes for performance


-- Add check constraints for data validation
ALTER TABLE elections ADD CONSTRAINT check_election_dates 
CHECK (start_time < end_time);

ALTER TABLE elections ADD CONSTRAINT check_election_active 
CHECK (is_active IN (true, false));

ALTER TABLE votes ADD CONSTRAINT check_vote_timestamp 
CHECK (created_at >= '2020-01-01'::timestamp);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_votes_election_candidate ON votes(election_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);
CREATE INDEX IF NOT EXISTS idx_candidates_election_votes ON candidates(election_id, votes);

-- Update table comments for documentation
COMMENT ON TABLE votes IS 'Encrypted vote records with digital signatures';
COMMENT ON TABLE elections IS 'Election definitions and metadata';
COMMENT ON TABLE candidates IS 'Election candidates with vote counts';
COMMENT ON TABLE auth_users IS 'User accounts with organization isolation';
COMMENT ON TABLE organizations IS 'Multi-tenant organization definitions';
COMMENT ON TABLE encrypted_votes IS 'AES-256 encrypted vote data with signatures';
COMMENT ON TABLE notification_templates IS 'Email notification templates';
COMMENT ON TABLE backup_config IS 'Automated backup configuration';
COMMENT ON TABLE retention_policies IS 'Data retention policies'; 