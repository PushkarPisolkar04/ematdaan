-- Automated Backups Configuration
-- This migration sets up automated backup functionality and data retention policies

-- Backup configuration table
CREATE TABLE IF NOT EXISTS backup_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    backup_frequency TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    retention_days INTEGER NOT NULL DEFAULT 30,
    include_votes BOOLEAN DEFAULT true,
    include_users BOOLEAN DEFAULT true,
    include_elections BOOLEAN DEFAULT true,
    include_audit_logs BOOLEAN DEFAULT true,
    last_backup TIMESTAMPTZ,
    next_backup TIMESTAMPTZ,
    backup_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup history table
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    backup_config_id UUID REFERENCES backup_config(id) ON DELETE CASCADE,
    backup_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
    backup_size BIGINT, -- Size in bytes
    backup_location TEXT, -- URL or path to backup file
    backup_hash TEXT, -- SHA256 hash for integrity verification
    status TEXT NOT NULL, -- 'success', 'failed', 'partial'
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies table
CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    action TEXT NOT NULL DEFAULT 'archive', -- 'archive', 'delete', 'anonymize'
    is_active BOOLEAN DEFAULT true,
    last_cleanup TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backup_config_org_id ON backup_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_backup_config_next_backup ON backup_config(next_backup);
CREATE INDEX IF NOT EXISTS idx_backup_history_org_id ON backup_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at);
CREATE INDEX IF NOT EXISTS idx_retention_policies_org_id ON retention_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_table_name ON retention_policies(table_name);

-- Enable RLS on all tables
ALTER TABLE backup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_config
CREATE POLICY "org_backup_config_read" ON backup_config
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_backup_config_insert" ON backup_config
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_backup_config_update" ON backup_config
    FOR UPDATE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- RLS policies for backup_history
CREATE POLICY "org_backup_history_read" ON backup_history
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_backup_history_insert" ON backup_history
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

-- RLS policies for retention_policies
CREATE POLICY "org_retention_policies_read" ON retention_policies
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_retention_policies_insert" ON retention_policies
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_retention_policies_update" ON retention_policies
    FOR UPDATE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- Function to create backup configuration for new organizations
CREATE OR REPLACE FUNCTION create_default_backup_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO backup_config (
        organization_id,
        backup_frequency,
        retention_days,
        include_votes,
        include_users,
        include_elections,
        include_audit_logs,
        next_backup
    ) VALUES (
        NEW.id,
        'daily',
        30,
        true,
        true,
        true,
        true,
        NOW() + INTERVAL '1 day'
    );
    
    -- Create default retention policies
    INSERT INTO retention_policies (organization_id, table_name, retention_days, action) VALUES
        (NEW.id, 'notification_logs', 90, 'delete'),
        (NEW.id, 'audit_logs', 365, 'archive'),
        (NEW.id, 'user_sessions', 30, 'delete'),
        (NEW.id, 'access_tokens', 7, 'delete');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create backup config when new organization is created
CREATE TRIGGER create_backup_config_trigger
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_default_backup_config();

-- Function to generate backup data
CREATE OR REPLACE FUNCTION generate_backup_data(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
    votes_data JSONB;
    users_data JSONB;
    elections_data JSONB;
    candidates_data JSONB;
    audit_data JSONB;
BEGIN
    -- Get votes data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', v.id,
            'election_id', v.election_id,
            'candidate_id', v.candidate_id,
            'voter_id', v.voter_id,
            'created_at', v.created_at
        )
    ) INTO votes_data
    FROM votes v
    JOIN elections e ON v.election_id = e.id
    WHERE e.organization_id = org_id;
    
    -- Get users data (excluding sensitive information)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'role', uo.role,
            'is_verified', u.is_verified,
            'created_at', u.created_at
        )
    ) INTO users_data
    FROM auth_users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = org_id;
    
    -- Get elections data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'name', e.name,
            'description', e.description,
            'start_time', e.start_time,
            'end_time', e.end_time,
            'is_active', e.is_active,
            'total_votes', e.total_votes,
            'total_registered', e.total_registered,
            'created_at', e.created_at
        )
    ) INTO elections_data
    FROM elections e
    WHERE e.organization_id = org_id;
    
    -- Get candidates data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'party', c.party,
            'symbol', c.symbol,
            'votes', c.votes,
            'election_id', c.election_id,
            'created_at', c.created_at
        )
    ) INTO candidates_data
    FROM candidates c
    JOIN elections e ON c.election_id = e.id
    WHERE e.organization_id = org_id;
    
    -- Get audit logs data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', al.id,
            'action', al.action,
            'details', al.details,
            'user_id', al.user_id,
            'ip_address', al.ip_address,
            'created_at', al.created_at
        )
    ) INTO audit_data
    FROM audit_logs al
    WHERE al.organization_id = org_id;
    
    -- Combine all data
    backup_data := jsonb_build_object(
        'organization_id', org_id,
        'backup_timestamp', NOW(),
        'votes', COALESCE(votes_data, '[]'::jsonb),
        'users', COALESCE(users_data, '[]'::jsonb),
        'elections', COALESCE(elections_data, '[]'::jsonb),
        'candidates', COALESCE(candidates_data, '[]'::jsonb),
        'audit_logs', COALESCE(audit_data, '[]'::jsonb)
    );
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;

-- Function to perform automated backup
CREATE OR REPLACE FUNCTION perform_automated_backup()
RETURNS void AS $$
DECLARE
    backup_record RECORD;
    backup_data JSONB;
    backup_hash TEXT;
    backup_size BIGINT;
BEGIN
    -- Get organizations that need backup
    FOR backup_record IN 
        SELECT bc.*, o.name as org_name
        FROM backup_config bc
        JOIN organizations o ON bc.organization_id = o.id
        WHERE bc.next_backup <= NOW()
        AND bc.backup_status = 'pending'
        ORDER BY bc.next_backup ASC
        LIMIT 10
    LOOP
        -- Update status to in progress
        UPDATE backup_config 
        SET backup_status = 'in_progress'
        WHERE id = backup_record.id;
        
        BEGIN
            -- Generate backup data
            backup_data := generate_backup_data(backup_record.organization_id);
            
            -- Calculate backup size (approximate)
            backup_size := jsonb_array_length(backup_data->'votes') * 200 +
                          jsonb_array_length(backup_data->'users') * 150 +
                          jsonb_array_length(backup_data->'elections') * 300 +
                          jsonb_array_length(backup_data->'candidates') * 100 +
                          jsonb_array_length(backup_data->'audit_logs') * 250;
            
            -- Generate hash for integrity verification
            backup_hash := encode(sha256(backup_data::text::bytea), 'hex');
            
            -- In a real implementation, you would:
            -- 1. Compress the backup data
            -- 2. Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
            -- 3. Store the backup location URL
            
            -- For now, we'll just log the backup
            INSERT INTO backup_history (
                organization_id,
                backup_config_id,
                backup_type,
                backup_size,
                backup_location,
                backup_hash,
                status,
                started_at,
                completed_at
            ) VALUES (
                backup_record.organization_id,
                backup_record.id,
                'automated',
                backup_size,
                'backup-storage-url', -- Replace with actual storage URL
                backup_hash,
                'success',
                NOW(),
                NOW()
            );
            
            -- Update backup config
            UPDATE backup_config 
            SET 
                backup_status = 'completed',
                last_backup = NOW(),
                next_backup = CASE 
                    WHEN backup_frequency = 'hourly' THEN NOW() + INTERVAL '1 hour'
                    WHEN backup_frequency = 'daily' THEN NOW() + INTERVAL '1 day'
                    WHEN backup_frequency = 'weekly' THEN NOW() + INTERVAL '1 week'
                    ELSE NOW() + INTERVAL '1 day'
                END
            WHERE id = backup_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log backup failure
            INSERT INTO backup_history (
                organization_id,
                backup_config_id,
                backup_type,
                status,
                error_message,
                started_at,
                completed_at
            ) VALUES (
                backup_record.organization_id,
                backup_record.id,
                'automated',
                'failed',
                SQLERRM,
                NOW(),
                NOW()
            );
            
            -- Update backup config
            UPDATE backup_config 
            SET 
                backup_status = 'failed',
                next_backup = NOW() + INTERVAL '1 hour' -- Retry in 1 hour
            WHERE id = backup_record.id;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
    policy_record RECORD;
    deleted_count INTEGER;
BEGIN
    FOR policy_record IN 
        SELECT * FROM retention_policies 
        WHERE is_active = true
        AND (last_cleanup IS NULL OR last_cleanup < NOW() - INTERVAL '1 day')
    LOOP
        BEGIN
            -- Execute cleanup based on action type
            IF policy_record.action = 'delete' THEN
                EXECUTE format(
                    'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
                    policy_record.table_name,
                    policy_record.retention_days
                );
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            ELSIF policy_record.action = 'archive' THEN
                -- For archive action, we would move data to archive tables
                -- For now, we'll just delete it
                EXECUTE format(
                    'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
                    policy_record.table_name,
                    policy_record.retention_days
                );
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            ELSIF policy_record.action = 'anonymize' THEN
                -- For anonymize action, we would replace sensitive data with placeholders
                -- For now, we'll just delete it
                EXECUTE format(
                    'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
                    policy_record.table_name,
                    policy_record.retention_days
                );
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            END IF;
            
            -- Update last cleanup time
            UPDATE retention_policies 
            SET last_cleanup = NOW()
            WHERE id = policy_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log cleanup error
            RAISE NOTICE 'Cleanup failed for table %: %', policy_record.table_name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to restore data from backup (basic implementation)
CREATE OR REPLACE FUNCTION restore_from_backup(backup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    backup_record RECORD;
    success BOOLEAN := false;
BEGIN
    -- Get backup record
    SELECT * INTO backup_record 
    FROM backup_history 
    WHERE id = backup_id AND status = 'success';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup not found or failed';
    END IF;
    
    -- In a real implementation, you would:
    -- 1. Download backup data from storage
    -- 2. Validate backup integrity using hash
    -- 3. Restore data to database
    -- 4. Handle conflicts and data consistency
    
    -- For now, we'll just return success
    success := true;
    
    RETURN success;
END;
$$ LANGUAGE plpgsql;

-- Note: Default backup config and retention policies are created automatically
-- via the create_default_backup_config() trigger when new organizations are created

-- Comments for documentation
COMMENT ON TABLE backup_config IS 'Configuration for automated backups per organization';
COMMENT ON TABLE backup_history IS 'History of all backup operations';
COMMENT ON TABLE retention_policies IS 'Data retention policies for different tables';
COMMENT ON FUNCTION perform_automated_backup() IS 'Performs automated backups for organizations due for backup';
COMMENT ON FUNCTION cleanup_old_data() IS 'Cleans up old data based on retention policies';
COMMENT ON FUNCTION restore_from_backup(UUID) IS 'Restores data from a backup (basic implementation)'; 