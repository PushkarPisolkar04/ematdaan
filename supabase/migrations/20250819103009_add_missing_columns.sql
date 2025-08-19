-- Add Missing Columns Migration
-- This migration adds the missing columns needed for organization functionality

-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS code_access_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voter_access_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS admin_access_code TEXT UNIQUE;

-- Create indexes for better performance on access codes
CREATE INDEX IF NOT EXISTS idx_organizations_voter_code ON organizations(voter_access_code);
CREATE INDEX IF NOT EXISTS idx_organizations_admin_code ON organizations(admin_access_code);
CREATE INDEX IF NOT EXISTS idx_organizations_code_enabled ON organizations(code_access_enabled);

-- Update existing organizations to have code access enabled
UPDATE organizations 
SET code_access_enabled = true 
WHERE code_access_enabled IS NULL; 