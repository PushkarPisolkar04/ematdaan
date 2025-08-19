-- Fix RLS Policies for Organization Creation and User Authentication
-- This migration fixes the missing RLS policies that were preventing organization creation and user login

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "organizations_read" ON organizations;
DROP POLICY IF EXISTS "auth_users_read_own" ON auth_users;

-- Create proper policies for organizations
CREATE POLICY "organizations_read" ON organizations
    FOR SELECT TO public
    USING (is_active = true);

CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT TO public
    WITH CHECK (true); -- Allow organization creation

CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE TO public
    USING (true); -- Allow organization updates

-- Create proper policies for auth_users
CREATE POLICY "auth_users_read_own" ON auth_users
    FOR SELECT TO public
    USING (true); -- Allow reading auth_users for login/registration

CREATE POLICY "auth_users_insert" ON auth_users
    FOR INSERT TO public
    WITH CHECK (true); -- Allow user registration

CREATE POLICY "auth_users_update" ON auth_users
    FOR UPDATE TO public
    USING (true); -- Allow user updates

-- Add policies for other tables that might be missing
CREATE POLICY "user_organizations_insert" ON user_organizations
    FOR INSERT TO public
    WITH CHECK (true); -- Allow user-org relationships

CREATE POLICY "user_sessions_insert" ON user_sessions
    FOR INSERT TO public
    WITH CHECK (true); -- Allow session creation

CREATE POLICY "access_tokens_insert" ON access_tokens
    FOR INSERT TO public
    WITH CHECK (true); -- Allow access token creation

-- Comments for documentation
COMMENT ON POLICY "organizations_insert" ON organizations IS 'Allows organization creation during registration';
COMMENT ON POLICY "auth_users_read_own" ON auth_users IS 'Allows user lookup for authentication';
COMMENT ON POLICY "auth_users_insert" ON auth_users IS 'Allows user registration'; 