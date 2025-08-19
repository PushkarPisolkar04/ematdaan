-- Fix user_organizations joined_via constraint
-- This migration updates the constraint to allow 'organization_creation' value

-- Drop the existing constraint
ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS user_organizations_joined_via_check;

-- Add the updated constraint with 'organization_creation' included
ALTER TABLE user_organizations ADD CONSTRAINT user_organizations_joined_via_check 
CHECK (joined_via IN ('invitation', 'access_code', 'email_domain', 'organization_creation'));

-- Grant permissions on the user_organizations table
GRANT ALL ON user_organizations TO anon;
GRANT ALL ON user_organizations TO authenticated;
GRANT ALL ON user_organizations TO service_role;

-- Ensure RLS is disabled for user_organizations table
ALTER TABLE user_organizations DISABLE ROW LEVEL SECURITY; 