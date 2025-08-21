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

DROP FUNCTION IF EXISTS generate_invitation_token() CASCADE;
DROP FUNCTION IF EXISTS generate_session_token() CASCADE;
DROP FUNCTION IF EXISTS generate_otp() CASCADE;
DROP FUNCTION IF EXISTS validate_invitation_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS has_user_voted(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_user_session(UUID, UUID, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS invalidate_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(UUID, UUID, TEXT, JSONB) CASCADE;


DROP FUNCTION IF EXISTS set_organization_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS set_user_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_access_code() CASCADE;
DROP FUNCTION IF EXISTS validate_access_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS logout_user_session(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;


DROP POLICY IF EXISTS "organizations_service_create" ON organizations;
DROP POLICY IF EXISTS "organizations_service_read" ON organizations;
DROP POLICY IF EXISTS "organizations_service_update" ON organizations;
DROP POLICY IF EXISTS "organizations_anon_create" ON organizations;
DROP POLICY IF EXISTS "organizations_anon_read" ON organizations;
DROP POLICY IF EXISTS "organizations_read_own" ON organizations;
DROP POLICY IF EXISTS "organizations_admin_update" ON organizations;


DROP POLICY IF EXISTS "auth_users_service_create" ON auth_users;
DROP POLICY IF EXISTS "auth_users_service_read" ON auth_users;
DROP POLICY IF EXISTS "auth_users_service_update" ON auth_users;
DROP POLICY IF EXISTS "auth_users_anon_create" ON auth_users;
DROP POLICY IF EXISTS "auth_users_anon_read" ON auth_users;
DROP POLICY IF EXISTS "auth_users_read_own" ON auth_users;
DROP POLICY IF EXISTS "auth_users_update_own" ON auth_users;
DROP POLICY IF EXISTS "auth_users_admin_read" ON auth_users;


DROP POLICY IF EXISTS "user_organizations_service_create" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_service_read" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_service_update" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_anon_create" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_anon_read" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_read_own" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_admin_read" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_admin_manage" ON user_organizations;


DROP POLICY IF EXISTS "elections_service_manage" ON elections;
DROP POLICY IF EXISTS "elections_read_org" ON elections;
DROP POLICY IF EXISTS "elections_admin_manage" ON elections;
DROP POLICY IF EXISTS "elections_authenticated_create" ON elections;
DROP POLICY IF EXISTS "elections_temp_create" ON elections;


DROP POLICY IF EXISTS "candidates_service_manage" ON candidates;
DROP POLICY IF EXISTS "candidates_read_org" ON candidates;
DROP POLICY IF EXISTS "candidates_admin_manage" ON candidates;


DROP POLICY IF EXISTS "votes_service_manage" ON votes;
DROP POLICY IF EXISTS "votes_read_own" ON votes;
DROP POLICY IF EXISTS "votes_insert_own" ON votes;
DROP POLICY IF EXISTS "votes_admin_read" ON votes;


DROP POLICY IF EXISTS "encrypted_votes_service_manage" ON encrypted_votes;
DROP POLICY IF EXISTS "encrypted_votes_read_own" ON encrypted_votes;
DROP POLICY IF EXISTS "encrypted_votes_insert_own" ON encrypted_votes;
DROP POLICY IF EXISTS "encrypted_votes_admin_read" ON encrypted_votes;


DROP POLICY IF EXISTS "merkle_trees_service_manage" ON merkle_trees;
DROP POLICY IF EXISTS "merkle_trees_read_org" ON merkle_trees;
DROP POLICY IF EXISTS "merkle_trees_admin_manage" ON merkle_trees;


DROP POLICY IF EXISTS "zk_proofs_service_manage" ON zk_proofs;
DROP POLICY IF EXISTS "zk_proofs_read_own" ON zk_proofs;
DROP POLICY IF EXISTS "zk_proofs_insert_own" ON zk_proofs;
DROP POLICY IF EXISTS "zk_proofs_admin_read" ON zk_proofs;


DROP POLICY IF EXISTS "vote_verifications_service_manage" ON vote_verifications;
DROP POLICY IF EXISTS "vote_verifications_read_own" ON vote_verifications;
DROP POLICY IF EXISTS "vote_verifications_insert_own" ON vote_verifications;
DROP POLICY IF EXISTS "vote_verifications_admin_read" ON vote_verifications;


DROP POLICY IF EXISTS "mfa_tokens_service_manage" ON mfa_tokens;
DROP POLICY IF EXISTS "mfa_tokens_read_own" ON mfa_tokens;
DROP POLICY IF EXISTS "mfa_tokens_insert_own" ON mfa_tokens;


DROP POLICY IF EXISTS "user_sessions_service_manage" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_anon_create" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_anon_read" ON user_sessions;
DROP POLICY IF EXISTS "sessions_read_own" ON user_sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON user_sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON user_sessions;


DROP POLICY IF EXISTS "otps_validate" ON otps;
DROP POLICY IF EXISTS "otps_anon_create" ON otps;
DROP POLICY IF EXISTS "otps_anon_update" ON otps;
DROP POLICY IF EXISTS "otps_service_manage" ON otps;


DROP POLICY IF EXISTS "access_tokens_validate" ON access_tokens;
DROP POLICY IF EXISTS "access_tokens_service_manage" ON access_tokens;
DROP POLICY IF EXISTS "access_tokens_admin_manage" ON access_tokens;


DROP POLICY IF EXISTS "audit_logs_service_manage" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_read_own" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;


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


CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    party TEXT,
    symbol TEXT,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    vote_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, election_id)
);


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


CREATE TABLE merkle_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    root_hash TEXT NOT NULL,
    tree_data JSONB NOT NULL,
    proof_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(election_id)
);


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


CREATE TABLE mfa_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


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


CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    details JSONB, -- Store additional data like organization details
    created_at TIMESTAMPTZ DEFAULT NOW()
);


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


CREATE TABLE student_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES auth_users(id),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


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


CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX idx_elections_org ON elections(organization_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_votes_user_election ON votes(user_id, election_id);
CREATE INDEX idx_votes_election ON votes(election_id);


CREATE INDEX idx_encrypted_votes_election ON encrypted_votes(election_id);
CREATE INDEX idx_encrypted_votes_voter ON encrypted_votes(voter_id);
CREATE INDEX idx_merkle_trees_election ON merkle_trees(election_id);
CREATE INDEX idx_zk_proofs_vote ON zk_proofs(vote_id);
CREATE INDEX idx_zk_proofs_election ON zk_proofs(election_id);
CREATE INDEX idx_vote_verifications_vote ON vote_verifications(vote_id);
CREATE INDEX idx_vote_verifications_voter ON vote_verifications(voter_id);
CREATE INDEX idx_mfa_tokens_user ON mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_expires ON mfa_tokens(expires_at);


CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_org ON access_tokens(organization_id);
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_otp ON otps(otp);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);


CREATE INDEX idx_student_invitations_org ON student_invitations(organization_id);
CREATE INDEX idx_student_invitations_token ON student_invitations(invitation_token);
CREATE INDEX idx_student_invitations_email ON student_invitations(email);
CREATE INDEX idx_student_invitations_expires ON student_invitations(expires_at);


CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(48), 'base64') || 
           encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex') || 
           encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
    RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex') || 
           encode(gen_random_bytes(16), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_access_token(p_token TEXT)
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

CREATE OR REPLACE FUNCTION logout_user_session(p_session_token TEXT)
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
    
    PERFORM log_audit_event(session_record.organization_id, session_record.user_id, 'session_logout', '{}');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_organization_context(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.organization_id', p_organization_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_user_context(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION has_user_voted(p_user_id UUID, p_election_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM votes 
        WHERE user_id = p_user_id AND election_id = p_election_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_invitation_used(p_invitation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE student_invitations 
    SET is_used = true, used_by = p_user_id, used_at = NOW(), updated_at = NOW() 
    WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


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


CREATE POLICY "organizations_service_create" ON organizations
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "organizations_service_read" ON organizations
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "organizations_service_update" ON organizations
    FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "organizations_anon_create" ON organizations
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "organizations_anon_read" ON organizations
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "organizations_read_own" ON organizations
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "organizations_admin_update" ON organizations
    FOR UPDATE TO authenticated
    USING (id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

CREATE POLICY "auth_users_service_create" ON auth_users
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "auth_users_service_read" ON auth_users
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "auth_users_service_update" ON auth_users
    FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "auth_users_anon_create" ON auth_users
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "auth_users_anon_read" ON auth_users
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "auth_users_read_own" ON auth_users
    FOR SELECT TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_update_own" ON auth_users
    FOR UPDATE TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_admin_read" ON auth_users
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT uo.user_id FROM user_organizations uo
        WHERE uo.organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = current_setting('app.user_id')::uuid 
            AND role = 'admin'
        )
    ));

CREATE POLICY "user_organizations_service_create" ON user_organizations
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "user_organizations_service_read" ON user_organizations
    FOR SELECT TO service_role
    USING (true);

CREATE POLICY "user_organizations_service_update" ON user_organizations
    FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "user_organizations_anon_create" ON user_organizations
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "user_organizations_anon_read" ON user_organizations
    FOR SELECT TO anon
    USING (true);

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

CREATE POLICY "user_organizations_admin_manage" ON user_organizations
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ))
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

CREATE POLICY "elections_service_manage" ON elections
    FOR ALL TO service_role
    USING (true);

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
    ))
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

CREATE POLICY "elections_authenticated_create" ON elections
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "elections_temp_create" ON elections
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "candidates_service_manage" ON candidates
    FOR ALL TO service_role
    USING (true);

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
    ))
    WITH CHECK (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

CREATE POLICY "votes_service_manage" ON votes
    FOR ALL TO service_role
    USING (true);

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

CREATE POLICY "encrypted_votes_service_manage" ON encrypted_votes
    FOR ALL TO service_role
    USING (true);

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

CREATE POLICY "merkle_trees_service_manage" ON merkle_trees
    FOR ALL TO service_role
    USING (true);

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

CREATE POLICY "zk_proofs_service_manage" ON zk_proofs
    FOR ALL TO service_role
    USING (true);

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

CREATE POLICY "vote_verifications_service_manage" ON vote_verifications
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "vote_verifications_read_own" ON vote_verifications
    FOR SELECT TO authenticated
    USING (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "vote_verifications_insert_own" ON vote_verifications
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "vote_verifications_admin_read" ON vote_verifications
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

CREATE POLICY "mfa_tokens_service_manage" ON mfa_tokens
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "mfa_tokens_read_own" ON mfa_tokens
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "mfa_tokens_insert_own" ON mfa_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "user_sessions_service_manage" ON user_sessions
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "user_sessions_anon_create" ON user_sessions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "user_sessions_anon_read" ON user_sessions
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "sessions_read_own" ON user_sessions
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "sessions_insert_own" ON user_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "sessions_update_own" ON user_sessions
    FOR UPDATE TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "otps_validate" ON otps
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "otps_anon_create" ON otps
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "otps_anon_update" ON otps
    FOR UPDATE TO anon
    USING (true);

CREATE POLICY "otps_service_manage" ON otps
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "access_tokens_validate" ON access_tokens
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "access_tokens_service_manage" ON access_tokens
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "access_tokens_admin_manage" ON access_tokens
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

ALTER TABLE student_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_invitations_service_manage" ON student_invitations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "student_invitations_admin_manage" ON student_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo 
            WHERE uo.user_id = auth.uid() 
            AND uo.organization_id = student_invitations.organization_id 
            AND uo.role = 'admin'
        )
    );

CREATE POLICY "student_invitations_read_org" ON student_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo 
            WHERE uo.user_id = auth.uid() 
            AND uo.organization_id = student_invitations.organization_id
        )
    );

CREATE POLICY "audit_logs_service_manage" ON audit_logs
    FOR ALL TO service_role
    USING (true);

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

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_users_updated_at 
    BEFORE UPDATE ON auth_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_invitations_updated_at 
    BEFORE UPDATE ON student_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


INSERT INTO audit_logs (action, details) 
VALUES (
    'migration_completed',
    '{"migration": "complete_system_reset", "tables_created": 16, "functions_created": 15, "policies_created": 59}'
); 