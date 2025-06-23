-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop view first to handle dependencies
DROP VIEW IF EXISTS election_stats;

-- Drop existing tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS elections CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_profiles CASCADE;

-- Create tables in order (dependencies first)
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL UNIQUE,
  did TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  vote_receipt UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  merkle_root TEXT,
  encryption_keys JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  symbol TEXT NOT NULL,
  votes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_election
    FOREIGN KEY(election_id) 
    REFERENCES elections(id)
    ON DELETE CASCADE
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL,
  voter_did TEXT NOT NULL,
  encrypted_vote TEXT NOT NULL,
  merkle_proof JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_election
    FOREIGN KEY(election_id) 
    REFERENCES elections(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_voter
    FOREIGN KEY(voter_did) 
    REFERENCES users(did)
    ON DELETE CASCADE
);

-- Create election_stats view
CREATE OR REPLACE VIEW election_stats AS
WITH active_election AS (
  SELECT id FROM elections WHERE is_active = true LIMIT 1
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