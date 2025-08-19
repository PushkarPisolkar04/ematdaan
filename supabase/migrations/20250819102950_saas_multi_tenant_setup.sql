-- SaaS Multi-Tenant Architecture Migration
-- This migration implements the secure invitation-based voting platform

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'free',
    max_users INTEGER DEFAULT 100,
    max_elections INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    voter_access_code TEXT UNIQUE,
    admin_access_code TEXT UNIQUE,
    code_access_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create access tokens table for secure invitations
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('voter', 'admin')),
    election_id UUID, -- Optional: for election-specific invitations
    expires_at TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID, -- User who created the token
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create auth_users table for traditional authentication
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    date_of_birth DATE,
    role TEXT DEFAULT 'voter' CHECK (role IN ('voter', 'admin', 'org_owner')),
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_organizations table for multi-org support
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('voter', 'admin', 'org_owner')),
    joined_via TEXT CHECK (joined_via IN ('invitation', 'access_code', 'email_domain')),
    access_token_id UUID REFERENCES access_tokens(id),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
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

-- Create audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_org ON access_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- Row Level Security (RLS) policies
CREATE POLICY "organizations_read" ON organizations
    FOR SELECT TO public
    USING (is_active = true);

CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT TO public
    WITH CHECK (true); -- Allow organization creation

CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE TO public
    USING (true); -- Allow organization updates

CREATE POLICY "access_tokens_read_own" ON access_tokens
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "access_tokens_insert" ON access_tokens
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "auth_users_read_own" ON auth_users
    FOR SELECT TO public
    USING (true); -- Allow reading auth_users for login/registration

CREATE POLICY "auth_users_insert" ON auth_users
    FOR INSERT TO public
    WITH CHECK (true); -- Allow user registration

CREATE POLICY "auth_users_update" ON auth_users
    FOR UPDATE TO public
    USING (true); -- Allow user updates

CREATE POLICY "user_organizations_read_own" ON user_organizations
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "user_organizations_insert" ON user_organizations
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "user_sessions_read_own" ON user_sessions
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "user_sessions_insert" ON user_sessions
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "audit_logs_read_own" ON audit_logs
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create function to set organization context
CREATE OR REPLACE FUNCTION set_organization_context(org_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.organization_id', org_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to set user context
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to generate secure access codes
CREATE OR REPLACE FUNCTION generate_access_code(org_slug TEXT, role TEXT)
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate format: org-XXXXXX (e.g., school-aB3k9x)
        code := org_slug || '-' || encode(gen_random_bytes(3), 'base64');
        code := replace(code, '/', '');
        code := replace(code, '+', '');
        code := replace(code, '=', '');
        
        -- Check if code already exists
        IF NOT EXISTS (
            SELECT 1 FROM organizations 
            WHERE (role = 'voter' AND voter_access_code = code) 
               OR (role = 'admin' AND admin_access_code = code)
        ) THEN
            RETURN code;
        END IF;
        
        counter := counter + 1;
        IF counter > 10 THEN
            RAISE EXCEPTION 'Unable to generate unique access code after 10 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Create function to validate access token
CREATE OR REPLACE FUNCTION validate_access_token(p_token TEXT)
RETURNS TABLE(
    token_id UUID,
    organization_id UUID,
    role TEXT,
    election_id UUID,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.organization_id,
        at.role,
        at.election_id,
        (at.is_active = true AND at.expires_at > NOW() AND at.used_count < at.usage_limit) as is_valid
    FROM access_tokens at
    WHERE at.token = p_token;
END;
$$ LANGUAGE plpgsql;

-- Create function to create user session
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
    -- Generate session token
    session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert session
    INSERT INTO user_sessions (
        user_id,
        session_token,
        organization_id,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        session_token,
        p_organization_id,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '24 hours'
    );
    
    -- Update last login
    UPDATE auth_users 
    SET last_login = NOW(), login_attempts = 0, is_locked = false
    WHERE id = p_user_id;
    
    RETURN session_token;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate session
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE(
    user_id UUID,
    organization_id UUID,
    role TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.user_id,
        s.organization_id,
        uo.role,
        au.email
    FROM user_sessions s
    JOIN user_organizations uo ON s.user_id = uo.user_id AND s.organization_id = uo.organization_id
    JOIN auth_users au ON s.user_id = au.id
    WHERE s.session_token = p_session_token
    AND s.expires_at > NOW()
    AND s.is_active = true
    AND uo.is_active = true
    AND au.is_verified = true
    AND au.is_locked = false;
END;
$$ LANGUAGE plpgsql;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_organization_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
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
        p_ip_address,
        p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deactivate expired sessions first
    UPDATE user_sessions SET is_active = false WHERE expires_at < NOW() AND is_active = true;
    -- Delete sessions older than 30 days
    DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM access_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create elections table
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_votes INTEGER DEFAULT 0,
    total_registered INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    party TEXT,
    symbol TEXT,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encrypted_vote TEXT NOT NULL,
    vote_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for core tables
CREATE INDEX IF NOT EXISTS idx_elections_organization ON elections(organization_id);
CREATE INDEX IF NOT EXISTS idx_elections_active ON elections(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_organization ON votes(organization_id);

-- Enable RLS on core tables
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for elections
CREATE POLICY "elections_select_policy" ON elections
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "elections_insert_policy" ON elections
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "elections_update_policy" ON elections
    FOR UPDATE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- Create RLS policies for candidates
CREATE POLICY "candidates_select_policy" ON candidates
    FOR SELECT TO public
    USING (election_id IN (SELECT id FROM elections WHERE organization_id = current_setting('app.organization_id')::uuid));

CREATE POLICY "candidates_insert_policy" ON candidates
    FOR INSERT TO public
    WITH CHECK (election_id IN (SELECT id FROM elections WHERE organization_id = current_setting('app.organization_id')::uuid));

-- Create RLS policies for votes
CREATE POLICY "votes_select_policy" ON votes
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "votes_insert_policy" ON votes
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

-- Create encrypted_votes table for additional security
CREATE TABLE IF NOT EXISTS encrypted_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for encrypted_votes
CREATE INDEX IF NOT EXISTS idx_encrypted_votes_election ON encrypted_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_votes_voter ON encrypted_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_votes_organization ON encrypted_votes(organization_id);

-- Enable RLS on encrypted_votes
ALTER TABLE encrypted_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for encrypted_votes
CREATE POLICY "encrypted_votes_select_policy" ON encrypted_votes
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "encrypted_votes_insert_policy" ON encrypted_votes
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

-- Create function to logout user (deactivate session)
CREATE OR REPLACE FUNCTION logout_user_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    session_found BOOLEAN := false;
BEGIN
    -- Deactivate the session
    UPDATE user_sessions 
    SET is_active = false 
    WHERE session_token = p_session_token AND is_active = true;
    
    GET DIAGNOSTICS session_found = FOUND;
    RETURN session_found;
END;
$$ LANGUAGE plpgsql;
