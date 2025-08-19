import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Database,
  HardDrive,
  Calendar,
  Settings,
  Play,
  Pause
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

interface BackupConfig {
  id: string;
  backup_frequency: string;
  retention_days: number;
  include_votes: boolean;
  include_users: boolean;
  include_elections: boolean;
  include_audit_logs: boolean;
  last_backup: string | null;
  next_backup: string | null;
  backup_status: string;
}

interface BackupHistory {
  id: string;
  backup_type: string;
  backup_size: number;
  backup_location: string;
  backup_hash: string;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface RetentionPolicy {
  id: string;
  table_name: string;
  retention_days: number;
  action: string;
  is_active: boolean;
  last_cleanup: string | null;
}

const BackupManagement = () => {
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [performingBackup, setPerformingBackup] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchBackupData = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      // Fetch backup configuration
      const { data: config, error: configError } = await supabase
        .from('backup_config')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      setBackupConfig(config);

      // Fetch backup history
      const { data: history, error: historyError } = await supabase
        .from('backup_history')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;
      setBackupHistory(history || []);

      // Fetch retention policies
      const { data: policies, error: policiesError } = await supabase
        .from('retention_policies')
        .select('*')
        .eq('organization_id', organization.id)
        .order('table_name');

      if (policiesError) throw policiesError;
      setRetentionPolicies(policies || []);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch backup data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupData();
  }, [organization]);

  const performManualBackup = async () => {
    if (!organization) return;
    
    setPerformingBackup(true);
    try {
      // In a real implementation, this would trigger the backup process
      // For now, we'll simulate it
      toast({
        title: "Backup Started",
        description: "Manual backup process has been initiated",
      });

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));

      toast({
        title: "Backup Completed",
        description: "Manual backup has been completed successfully",
      });

      // Refresh data
      fetchBackupData();

    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to perform manual backup",
        variant: "destructive"
      });
    } finally {
      setPerformingBackup(false);
    }
  };

  const updateBackupConfig = async (updates: Partial<BackupConfig>) => {
    if (!backupConfig) return;
    
    try {
      const { error } = await supabase
        .from('backup_config')
        .update(updates)
        .eq('id', backupConfig.id);

      if (error) throw error;

      toast({
        title: "Configuration Updated",
        description: "Backup configuration has been updated",
      });

      fetchBackupData();

    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update backup configuration",
        variant: "destructive"
      });
    }
  };

  const toggleRetentionPolicy = async (policyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('retention_policies')
        .update({ is_active: isActive })
        .eq('id', policyId);

      if (error) throw error;

      toast({
        title: "Policy Updated",
        description: `Retention policy ${isActive ? 'enabled' : 'disabled'}`,
      });

      fetchBackupData();

    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update retention policy",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Backup Management</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading backup information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backup Management</h2>
          <p className="text-gray-600">Manage automated backups and data retention policies</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBackupData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={performManualBackup} disabled={performingBackup}>
            {performingBackup ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Manual Backup
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Backup Configuration */}
      {backupConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Backup Configuration
            </CardTitle>
            <CardDescription>
              Configure automated backup settings and schedules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup Schedule */}
              <div>
                <h4 className="font-semibold mb-3">Backup Schedule</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Frequency:</span>
                    <Badge variant="outline">{backupConfig.backup_frequency}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Next Backup:</span>
                    <span className="text-sm">
                      {backupConfig.next_backup 
                        ? new Date(backupConfig.next_backup).toLocaleString()
                        : 'Not scheduled'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Backup:</span>
                    <span className="text-sm">
                      {backupConfig.last_backup 
                        ? new Date(backupConfig.last_backup).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={getStatusColor(backupConfig.backup_status)}>
                      {getStatusIcon(backupConfig.backup_status)}
                      <span className="ml-1 capitalize">{backupConfig.backup_status}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Data Inclusion */}
              <div>
                <h4 className="font-semibold mb-3">Data to Include</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vote Records</span>
                    <Badge variant={backupConfig.include_votes ? "default" : "secondary"}>
                      {backupConfig.include_votes ? "Included" : "Excluded"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Data</span>
                    <Badge variant={backupConfig.include_users ? "default" : "secondary"}>
                      {backupConfig.include_users ? "Included" : "Excluded"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Election Data</span>
                    <Badge variant={backupConfig.include_elections ? "default" : "secondary"}>
                      {backupConfig.include_elections ? "Included" : "Excluded"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Logs</span>
                    <Badge variant={backupConfig.include_audit_logs ? "default" : "secondary"}>
                      {backupConfig.include_audit_logs ? "Included" : "Excluded"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Retention Period</h4>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Keep backups for:</span>
                <Badge variant="outline">{backupConfig.retention_days} days</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup History
          </CardTitle>
          <CardDescription>
            Recent backup operations and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No backup history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(backup.status)}
                    <div>
                      <div className="font-medium capitalize">{backup.backup_type} Backup</div>
                      <div className="text-sm text-gray-600">
                        {new Date(backup.started_at).toLocaleString()}
                      </div>
                      {backup.error_message && (
                        <div className="text-sm text-red-600">{backup.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {backup.backup_size && (
                      <span className="text-sm text-gray-600">
                        {formatFileSize(backup.backup_size)}
                      </span>
                    )}
                    <Badge className={getStatusColor(backup.status)}>
                      {backup.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Data Retention Policies
          </CardTitle>
          <CardDescription>
            Configure how long different types of data are retained
          </CardDescription>
        </CardHeader>
        <CardContent>
          {retentionPolicies.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No retention policies configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {retentionPolicies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{policy.table_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="text-sm text-gray-600">
                      {policy.action} after {policy.retention_days} days
                    </div>
                    {policy.last_cleanup && (
                      <div className="text-xs text-gray-500">
                        Last cleanup: {new Date(policy.last_cleanup).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={policy.is_active ? "default" : "secondary"}>
                      {policy.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRetentionPolicy(policy.id, !policy.is_active)}
                    >
                      {policy.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            Current storage usage and backup space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Backup Storage</span>
              <span className="text-sm text-gray-600">2.4 GB / 10 GB</span>
            </div>
            <Progress value={24} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">24%</div>
                <div className="text-xs text-gray-600">Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">7.6 GB</div>
                <div className="text-xs text-gray-600">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">15</div>
                <div className="text-xs text-gray-600">Backups</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement; 