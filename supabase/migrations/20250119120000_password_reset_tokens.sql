-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token VARCHAR(32) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "password_reset_tokens_select_policy" ON password_reset_tokens
    FOR SELECT TO public
    USING (true); -- Allow reading for token verification

CREATE POLICY "password_reset_tokens_insert_policy" ON password_reset_tokens
    FOR INSERT TO public
    WITH CHECK (true); -- Allow inserting new tokens

CREATE POLICY "password_reset_tokens_update_policy" ON password_reset_tokens
    FOR UPDATE TO public
    USING (true); -- Allow updating to mark as used 