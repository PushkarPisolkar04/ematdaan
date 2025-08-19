-- Migration: Automated cleanup for expired sessions and access tokens
-- This migration sets up automated cleanup processes for security

-- Enable pg_cron extension for scheduled jobs (if available)
-- Note: pg_cron might not be available in all Supabase plans
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cleanup log table to track cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('sessions', 'tokens', 'otps', 'password_resets')),
    records_affected INTEGER DEFAULT 0,
    execution_time INTERVAL,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced cleanup function for expired sessions with logging
CREATE OR REPLACE FUNCTION cleanup_expired_sessions_with_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTERVAL;
BEGIN
    start_time := NOW();
    
    -- Deactivate expired sessions first
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE expires_at < NOW() AND is_active = true;
    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    
    -- Delete sessions older than 30 days
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    end_time := NOW();
    execution_time := end_time - start_time;
    
    -- Log the cleanup operation
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status
    ) VALUES (
        'sessions', 
        deactivated_count + deleted_count, 
        execution_time,
        'success'
    );
    
    RETURN deactivated_count + deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status,
        error_message
    ) VALUES (
        'sessions', 
        0, 
        NOW() - start_time,
        'failed',
        SQLERRM
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Enhanced cleanup function for expired tokens with logging
CREATE OR REPLACE FUNCTION cleanup_expired_tokens_with_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTERVAL;
BEGIN
    start_time := NOW();
    
    -- Mark expired tokens as inactive first
    UPDATE access_tokens 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Delete tokens older than 7 days after expiration
    DELETE FROM access_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    end_time := NOW();
    execution_time := end_time - start_time;
    
    -- Log the cleanup operation
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status
    ) VALUES (
        'tokens', 
        deleted_count, 
        execution_time,
        'success'
    );
    
    RETURN deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status,
        error_message
    ) VALUES (
        'tokens', 
        0, 
        NOW() - start_time,
        'failed',
        SQLERRM
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps_with_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTERVAL;
BEGIN
    start_time := NOW();
    
    -- Delete expired OTPs
    DELETE FROM otps 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    end_time := NOW();
    execution_time := end_time - start_time;
    
    -- Log the cleanup operation
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status
    ) VALUES (
        'otps', 
        deleted_count, 
        execution_time,
        'success'
    );
    
    RETURN deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status,
        error_message
    ) VALUES (
        'otps', 
        0, 
        NOW() - start_time,
        'failed',
        SQLERRM
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets_with_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time INTERVAL;
BEGIN
    start_time := NOW();
    
    -- Delete expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    end_time := NOW();
    execution_time := end_time - start_time;
    
    -- Log the cleanup operation
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status
    ) VALUES (
        'password_resets', 
        deleted_count, 
        execution_time,
        'success'
    );
    
    RETURN deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO cleanup_logs (
        operation_type, 
        records_affected, 
        execution_time,
        status,
        error_message
    ) VALUES (
        'password_resets', 
        0, 
        NOW() - start_time,
        'failed',
        SQLERRM
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function that runs all cleanup operations
CREATE OR REPLACE FUNCTION run_all_cleanup_operations()
RETURNS JSONB AS $$
DECLARE
    sessions_cleaned INTEGER;
    tokens_cleaned INTEGER;
    otps_cleaned INTEGER;
    password_resets_cleaned INTEGER;
    total_cleaned INTEGER;
    result JSONB;
BEGIN
    -- Run all cleanup operations
    SELECT cleanup_expired_sessions_with_log() INTO sessions_cleaned;
    SELECT cleanup_expired_tokens_with_log() INTO tokens_cleaned;
    SELECT cleanup_expired_otps_with_log() INTO otps_cleaned;
    SELECT cleanup_expired_password_resets_with_log() INTO password_resets_cleaned;
    
    total_cleaned := sessions_cleaned + tokens_cleaned + otps_cleaned + password_resets_cleaned;
    
    -- Return summary
    result := jsonb_build_object(
        'sessions_cleaned', sessions_cleaned,
        'tokens_cleaned', tokens_cleaned,
        'otps_cleaned', otps_cleaned,
        'password_resets_cleaned', password_resets_cleaned,
        'total_cleaned', total_cleaned,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function that runs cleanup on session validation
-- This ensures cleanup happens during normal application usage
CREATE OR REPLACE FUNCTION trigger_cleanup_on_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup occasionally (roughly 1 in 100 validations)
    -- to avoid performance impact
    IF random() < 0.01 THEN
        PERFORM cleanup_expired_sessions_with_log();
        PERFORM cleanup_expired_tokens_with_log();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_sessions table to occasionally run cleanup
DROP TRIGGER IF EXISTS trigger_occasional_cleanup ON user_sessions;
CREATE TRIGGER trigger_occasional_cleanup
    AFTER INSERT OR UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_on_validation();

-- Grant permissions for the cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions_with_log() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions_with_log() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions_with_log() TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_tokens_with_log() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens_with_log() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens_with_log() TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_otps_with_log() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_otps_with_log() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_otps_with_log() TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets_with_log() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets_with_log() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_resets_with_log() TO service_role;

GRANT EXECUTE ON FUNCTION run_all_cleanup_operations() TO anon;
GRANT EXECUTE ON FUNCTION run_all_cleanup_operations() TO authenticated;
GRANT EXECUTE ON FUNCTION run_all_cleanup_operations() TO service_role;

-- Grant permissions on cleanup_logs table
GRANT ALL ON cleanup_logs TO anon;
GRANT ALL ON cleanup_logs TO authenticated;
GRANT ALL ON cleanup_logs TO service_role;

-- If pg_cron is available, schedule the cleanup to run every hour
-- Note: This might not work in all Supabase plans, but it's here for reference
-- SELECT cron.schedule('cleanup-expired-data', '0 * * * *', 'SELECT run_all_cleanup_operations();');

-- Create a view to easily check cleanup status
CREATE OR REPLACE VIEW cleanup_status AS
SELECT 
    operation_type,
    COUNT(*) as total_runs,
    SUM(records_affected) as total_records_cleaned,
    AVG(EXTRACT(EPOCH FROM execution_time)) as avg_execution_seconds,
    MAX(created_at) as last_run,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs
FROM cleanup_logs
GROUP BY operation_type
ORDER BY operation_type;

GRANT SELECT ON cleanup_status TO anon;
GRANT SELECT ON cleanup_status TO authenticated;
GRANT SELECT ON cleanup_status TO service_role;

-- Add updated_at column to user_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$; 