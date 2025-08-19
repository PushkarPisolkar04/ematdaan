-- Notification System Tables
-- This migration adds tables for managing email notifications and templates

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'election_start', 'election_end', 'election_reminder', 'registration_welcome', 'password_reset', 'vote_confirmation'
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, organization_id)
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences table (for users to control what notifications they receive)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Scheduled notifications table (for future notifications)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_type TEXT NOT NULL,
    target_users JSONB NOT NULL, -- Array of user IDs or criteria
    variables JSONB NOT NULL, -- Template variables
    scheduled_for TIMESTAMPTZ NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_org_id ON notification_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- Enable RLS on all tables
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_templates
CREATE POLICY "org_notification_templates_read" ON notification_templates
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_notification_templates_insert" ON notification_templates
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_notification_templates_update" ON notification_templates
    FOR UPDATE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_notification_templates_delete" ON notification_templates
    FOR DELETE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- RLS policies for notification_logs
CREATE POLICY "org_notification_logs_read" ON notification_logs
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_notification_logs_insert" ON notification_logs
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

-- RLS policies for notification_preferences
CREATE POLICY "user_notification_preferences_read" ON notification_preferences
    FOR SELECT TO public
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "user_notification_preferences_insert" ON notification_preferences
    FOR INSERT TO public
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "user_notification_preferences_update" ON notification_preferences
    FOR UPDATE TO public
    USING (user_id = current_setting('app.user_id')::uuid);

-- RLS policies for scheduled_notifications
CREATE POLICY "org_scheduled_notifications_read" ON scheduled_notifications
    FOR SELECT TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_scheduled_notifications_insert" ON scheduled_notifications
    FOR INSERT TO public
    WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);

CREATE POLICY "org_scheduled_notifications_update" ON scheduled_notifications
    FOR UPDATE TO public
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- Note: Notification templates will be created per organization when organizations are created
-- through the admin registration process

-- Function to clean up old notification logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void AS $$
DECLARE
    notification_record RECORD;
BEGIN
    -- Get notifications that are due to be sent
    FOR notification_record IN 
        SELECT * FROM scheduled_notifications 
        WHERE status = 'pending' 
        AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT 100
    LOOP
        -- Mark as sent (in a real implementation, you'd send the actual notification here)
        UPDATE scheduled_notifications 
        SET status = 'sent', sent_at = NOW()
        WHERE id = notification_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE notification_templates IS 'Email notification templates with placeholders';
COMMENT ON TABLE notification_logs IS 'Log of all sent notifications for audit trail';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';
COMMENT ON TABLE scheduled_notifications IS 'Notifications scheduled for future delivery'; 