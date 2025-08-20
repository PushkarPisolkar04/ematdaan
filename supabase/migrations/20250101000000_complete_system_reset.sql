-- COMPLETE SYSTEM RESET MIGRATION
-- This migration drops all existing tables and creates the new system from scratch
-- Run this in Supabase web interface SQL editor

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES AND FUNCTIONS
-- =====================================================

-- Drop all existing tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vote_verifications CASCADE;
DROP TABLE IF EXISTS zk_proofs CASCADE;
DROP TABLE IF EXISTS merkle_trees CASCADE;
DROP TABLE IF EXISTS encrypted_votes CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS elections CASCADE;
DROP TABLE IF EXISTS mfa_tokens CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS access_tokens CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop all existing functions
DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS generate_session_token() CASCADE;
DROP FUNCTION IF EXISTS generate_otp() CASCADE;
DROP FUNCTION IF EXISTS validate_invitation_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS has_user_voted(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_user_session(UUID, UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS invalidate_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_tokens() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otps() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_mfa() CASCADE;
DROP FUNCTION IF EXISTS run_all_cleanup_operations() CASCADE;
DROP FUNCTION IF EXISTS auto_cleanup_expired() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_tokens() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otps() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_mfa() CASCADE;
DROP FUNCTION IF EXISTS run_all_cleanup_operations() CASCADE;

DROP FUNCTION IF EXISTS set_organization_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS set_user_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_access_code() CASCADE;
DROP FUNCTION IF EXISTS validate_access_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS logout_user_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =====================================================
-- STEP 2: CREATE NEW TABLES
-- =====================================================

-- 1. ORGANIZATIONS (Colleges/Schools)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    admin_email TEXT NOT NULL UNIQUE,
    admin_password_hash TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    max_users INTEGER DEFAULT 1000,
    max_elections INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTH_USERS (All users)
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    is_verified BOOLEAN DEFAULT false,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER_ORGANIZATIONS (User-Org relationships)
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    joined_via TEXT CHECK (joined_via IN ('invitation', 'admin_creation')),
    access_token_id UUID,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. ELECTIONS
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CANDIDATES
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    party TEXT,
    symbol TEXT,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VOTES (Basic votes)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    vote_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, election_id)
);

-- 7. ENCRYPTED_VOTES (Advanced vote encryption)
CREATE TABLE encrypted_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MERKLE_TREES (Merkle tree for vote verification)
CREATE TABLE merkle_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    root_hash TEXT NOT NULL,
    tree_data JSONB NOT NULL,
    proof_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(election_id)
);

-- 9. ZK_PROOFS (Zero-knowledge proofs)
CREATE TABLE zk_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id UUID NOT NULL REFERENCES encrypted_votes(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    proof_data JSONB NOT NULL,
    verification_key TEXT NOT NULL,
    circuit_hash TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. VOTE_VERIFICATIONS (Vote verification records)
CREATE TABLE vote_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id UUID NOT NULL REFERENCES encrypted_votes(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    verification_hash TEXT NOT NULL,
    merkle_proof JSONB NOT NULL,
    signature TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MFA_TOKENS (Multi-factor authentication)
CREATE TABLE mfa_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. USER_SESSIONS (Session management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 13. OTPS (OTP verification)
CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ACCESS_TOKENS (Invitations - COMPLEX & LONG)
CREATE TABLE access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL, -- 64+ character complex token
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    election_id UUID, -- Optional: for election-specific invitations
    expires_at TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AUDIT_LOGS (Security tracking)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Core tables indexes
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX idx_elections_org ON elections(organization_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_votes_user_election ON votes(user_id, election_id);
CREATE INDEX idx_votes_election ON votes(election_id);

-- Advanced security tables indexes
CREATE INDEX idx_encrypted_votes_election ON encrypted_votes(election_id);
CREATE INDEX idx_encrypted_votes_voter ON encrypted_votes(voter_id);
CREATE INDEX idx_merkle_trees_election ON merkle_trees(election_id);
CREATE INDEX idx_zk_proofs_vote ON zk_proofs(vote_id);
CREATE INDEX idx_zk_proofs_election ON zk_proofs(election_id);
CREATE INDEX idx_vote_verifications_vote ON vote_verifications(vote_id);
CREATE INDEX idx_vote_verifications_voter ON vote_verifications(voter_id);
CREATE INDEX idx_mfa_tokens_user ON mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_expires ON mfa_tokens(expires_at);

-- Session & verification tables indexes
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_org ON access_tokens(organization_id);
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_otp ON otps(otp);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
-- =====================================================

-- Generate complex invitation tokens (64+ characters)
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(48), 'base64') || 
           encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate complex session tokens (64+ characters)
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex') || 
           encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate complex OTP (6 digits)
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
    RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE(
    token_id UUID,
    organization_id UUID,
    role TEXT,
    election_id UUID,
    is_valid BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.organization_id,
        at.role,
        at.election_id,
        (at.is_active = true AND at.expires_at > NOW() AND at.used_count < at.usage_limit) as is_valid,
        CASE 
            WHEN at.is_active = false THEN 'Token is inactive'
            WHEN at.expires_at <= NOW() THEN 'Token has expired'
            WHEN at.used_count >= at.usage_limit THEN 'Token usage limit exceeded'
            ELSE 'Valid token'
        END as reason
    FROM access_tokens at
    WHERE at.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate session token
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE(
    user_id UUID,
    organization_id UUID,
    role TEXT,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.organization_id,
        uo.role,
        (us.is_active = true AND us.expires_at > NOW()) as is_valid
    FROM user_sessions us
    JOIN user_organizations uo ON us.user_id = uo.user_id AND us.organization_id = uo.organization_id
    WHERE us.session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has voted
CREATE OR REPLACE FUNCTION has_user_voted(p_user_id UUID, p_election_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM votes 
        WHERE user_id = p_user_id AND election_id = p_election_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_organization_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    session_token TEXT;
BEGIN
    session_token := generate_session_token();
    
    INSERT INTO user_sessions (
        user_id,
        organization_id,
        session_token,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        p_organization_id,
        session_token,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '24 hours'
    );
    
    PERFORM log_audit_event(p_organization_id, p_user_id, 'session_created', 
                           jsonb_build_object('ip_address', p_ip_address, 'user_agent', p_user_agent));
    
    RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invalidate session
CREATE OR REPLACE FUNCTION invalidate_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record FROM user_sessions WHERE session_token = p_session_token;
    
    IF session_record IS NULL THEN
        RETURN false;
    END IF;
    
    UPDATE user_sessions 
    SET is_active = false 
    WHERE session_token = p_session_token;
    
    PERFORM log_audit_event(session_record.organization_id, session_record.user_id, 'session_invalidated', '{}');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_organization_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_action,
        p_details,
        inet_client_addr(),
        current_setting('request.headers')::jsonb->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETE CLEANUP SYSTEM
-- =====================================================

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired access tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM access_tokens 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otps 
    WHERE expires_at < NOW() OR is_verified = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired MFA tokens
CREATE OR REPLACE FUNCTION cleanup_expired_mfa()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM mfa_tokens 
    WHERE expires_at < NOW() OR used = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master cleanup function - runs all cleanup operations
CREATE OR REPLACE FUNCTION run_all_cleanup_operations()
RETURNS JSONB AS $$
DECLARE
    sessions_cleaned INTEGER;
    tokens_cleaned INTEGER;
    otps_cleaned INTEGER;
    mfa_cleaned INTEGER;
    total_cleaned INTEGER;
BEGIN
    -- Run all cleanup operations
    SELECT cleanup_expired_sessions() INTO sessions_cleaned;
    SELECT cleanup_expired_tokens() INTO tokens_cleaned;
    SELECT cleanup_expired_otps() INTO otps_cleaned;
    SELECT cleanup_expired_mfa() INTO mfa_cleaned;
    
    total_cleaned := sessions_cleaned + tokens_cleaned + otps_cleaned + mfa_cleaned;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_cleaned', total_cleaned,
        'sessions_cleaned', sessions_cleaned,
        'tokens_cleaned', tokens_cleaned,
        'otps_cleaned', otps_cleaned,
        'mfa_cleaned', mfa_cleaned,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE merkle_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE zk_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- ORGANIZATIONS
CREATE POLICY "organizations_read_own" ON organizations
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "organizations_admin" ON organizations
    FOR ALL TO service_role
    USING (true);

-- AUTH_USERS
CREATE POLICY "auth_users_read_own" ON auth_users
    FOR SELECT TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_update_own" ON auth_users
    FOR UPDATE TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_insert" ON auth_users
    FOR INSERT TO service_role
    WITH CHECK (true);

-- USER_ORGANIZATIONS
CREATE POLICY "user_organizations_read_own" ON user_organizations
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "user_organizations_admin_read" ON user_organizations
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- ELECTIONS
CREATE POLICY "elections_read_org" ON elections
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "elections_admin_manage" ON elections
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- CANDIDATES
CREATE POLICY "candidates_read_org" ON candidates
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "candidates_admin_manage" ON candidates
    FOR ALL TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- VOTES
CREATE POLICY "votes_read_own" ON votes
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "votes_insert_own" ON votes
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = current_setting('app.user_id')::uuid AND
        NOT EXISTS (
            SELECT 1 FROM votes 
            WHERE user_id = current_setting('app.user_id')::uuid 
            AND election_id = votes.election_id
        )
    );

CREATE POLICY "votes_admin_read" ON votes
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- ENCRYPTED_VOTES
CREATE POLICY "encrypted_votes_read_own" ON encrypted_votes
    FOR SELECT TO authenticated
    USING (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "encrypted_votes_insert_own" ON encrypted_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "encrypted_votes_admin_read" ON encrypted_votes
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- MERKLE_TREES
CREATE POLICY "merkle_trees_read_org" ON merkle_trees
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "merkle_trees_admin_manage" ON merkle_trees
    FOR ALL TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- ZK_PROOFS
CREATE POLICY "zk_proofs_read_own" ON zk_proofs
    FOR SELECT TO authenticated
    USING (vote_id IN (
        SELECT id FROM encrypted_votes 
        WHERE voter_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "zk_proofs_insert_own" ON zk_proofs
    FOR INSERT TO authenticated
    WITH CHECK (vote_id IN (
        SELECT id FROM encrypted_votes 
        WHERE voter_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "zk_proofs_admin_read" ON zk_proofs
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- VOTE_VERIFICATIONS
CREATE POLICY "vote_verifications_read_own" ON vote_verifications
    FOR SELECT TO authenticated
    USING (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "vote_verifications_insert_own" ON vote_verifications
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = current_setting('app.user_id')::uuid);

-- MFA_TOKENS
CREATE POLICY "mfa_tokens_read_own" ON mfa_tokens
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "mfa_tokens_insert_own" ON mfa_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- USER_SESSIONS
CREATE POLICY "sessions_read_own" ON user_sessions
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "sessions_insert_own" ON user_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- OTPS
CREATE POLICY "otps_validate" ON otps
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "otps_service_manage" ON otps
    FOR ALL TO service_role
    USING (true);

-- ACCESS_TOKENS
CREATE POLICY "access_tokens_validate" ON access_tokens
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "access_tokens_admin_manage" ON access_tokens
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- AUDIT_LOGS
CREATE POLICY "audit_logs_read_own" ON audit_logs
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "audit_logs_admin_read" ON audit_logs
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =====================================================
-- STEP 7: CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_users_updated_at 
    BEFORE UPDATE ON auth_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- =====================================================
-- STEP 8: INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert a sample organization for testing
INSERT INTO organizations (name, slug, admin_email, admin_password_hash) 
VALUES (
    'Sample University',
    'sample-university',
    'admin@sampleuniversity.edu',
    '$2b$10$dummy.hash.for.testing.purposes.only'
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log the migration completion
INSERT INTO audit_logs (action, details) 
VALUES (
    'migration_completed',
    '{"migration": "complete_system_reset", "tables_created": 15, "functions_created": 10, "policies_created": 35}'
); 