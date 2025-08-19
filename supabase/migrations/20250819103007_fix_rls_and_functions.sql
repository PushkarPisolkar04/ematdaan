-- Fix RLS and Functions Migration
-- This migration ensures proper access to functions and fixes RLS issues

-- Ensure RLS is disabled for all tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE elections DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "organizations_read" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "auth_users_read_own" ON auth_users;
DROP POLICY IF EXISTS "auth_users_insert" ON auth_users;
DROP POLICY IF EXISTS "auth_users_update" ON auth_users;
DROP POLICY IF EXISTS "user_organizations_read_own" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_insert" ON user_organizations;
DROP POLICY IF EXISTS "user_sessions_read_own" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
DROP POLICY IF EXISTS "access_tokens_read_own" ON access_tokens;
DROP POLICY IF EXISTS "access_tokens_insert" ON access_tokens;
DROP POLICY IF EXISTS "audit_logs_read_own" ON audit_logs;

-- Recreate the generate_access_code function with proper permissions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION generate_access_code(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION generate_access_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_access_code(TEXT, TEXT) TO service_role;

-- Recreate other essential functions with proper permissions
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_invitation_token() TO anon;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO service_role;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_access_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_access_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_access_token(TEXT) TO service_role;

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
    
    RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_user_session(UUID, UUID, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_user_session(UUID, UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session(UUID, UUID, INET, TEXT) TO service_role;

-- Grant necessary permissions on tables
GRANT ALL ON organizations TO anon;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organizations TO service_role;

GRANT ALL ON auth_users TO anon;
GRANT ALL ON auth_users TO authenticated;
GRANT ALL ON auth_users TO service_role;

GRANT ALL ON user_organizations TO anon;
GRANT ALL ON user_organizations TO authenticated;
GRANT ALL ON user_organizations TO service_role;

GRANT ALL ON user_sessions TO anon;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON user_sessions TO service_role;

GRANT ALL ON access_tokens TO anon;
GRANT ALL ON access_tokens TO authenticated;
GRANT ALL ON access_tokens TO service_role;

GRANT ALL ON elections TO anon;
GRANT ALL ON elections TO authenticated;
GRANT ALL ON elections TO service_role;

GRANT ALL ON candidates TO anon;
GRANT ALL ON candidates TO authenticated;
GRANT ALL ON candidates TO service_role;

GRANT ALL ON votes TO anon;
GRANT ALL ON votes TO authenticated;
GRANT ALL ON votes TO service_role;

GRANT ALL ON encrypted_votes TO anon;
GRANT ALL ON encrypted_votes TO authenticated;
GRANT ALL ON encrypted_votes TO service_role;

GRANT ALL ON audit_logs TO anon;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role; 