-- Cleanup Organization Schema Migration
-- Remove unused subscription tier fields and simplify the schema

-- Update organizations table to remove unused fields
ALTER TABLE organizations 
DROP COLUMN IF EXISTS subscription_tier,
DROP COLUMN IF EXISTS max_users,
DROP COLUMN IF EXISTS max_elections;

-- Add a simple description field instead
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS description TEXT; 