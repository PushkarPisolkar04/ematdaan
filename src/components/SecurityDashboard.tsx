import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { getSecurityAuditLogs, getSecurityStats, SecurityAuditLog } from '@/lib/securityAudit';
import { useToast } from '@/hooks/use-toast';

const SecurityDashboard: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, [filter, timeRange]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [logs, stats] = await Promise.all([
        getSecurityAuditLogs({
          success: filter === 'all' ? undefined : filter === 'success',
          limit: 100
        }),
        getSecurityStats(null, timeRange)
      ]);

      setAuditLogs(logs);
      setSecurityStats(stats);
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: "Failed to Load Security Data",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeColor = (actionType: string): string => {
    switch (actionType) {
      case 'login_success':
      case 'mfa_success':
      case 'vote_cast':
        return 'bg-green-100 text-green-800';
      case 'login_failure':
      case 'mfa_failure':
      case 'rate_limit_exceeded':
      case 'suspicious_activity':
        return 'bg-red-100 text-red-800';
      case 'password_change':
      case 'admin_action':
        return 'bg-blue-100 text-blue-800';
      case 'vote_change':
      case 'vote_verification':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActionType = (actionType: string): string => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportAuditLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action Type', 'User ID', 'Success', 'Details'].join(','),
      ...auditLogs.map(log => [
        log.timestamp,
        log.action_type,
        log.user_id || 'N/A',
        log.success ? 'Success' : 'Failure',
        JSON.stringify(log.action_details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Audit Logs Exported",
      description: "Security audit logs have been downloaded as CSV",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Statistics */}
      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold">{securityStats.totalEvents}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{securityStats.successfulEvents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{securityStats.failedEvents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Security Score</p>
                  <p className="text-2xl font-bold text-blue-600">{securityStats.securityScore}%</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Audit Logs
              </CardTitle>
              <CardDescription>
                Real-time security events and audit trail
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter(filter === 'all' ? 'success' : filter === 'success' ? 'failure' : 'all')}
              >
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all' ? 'All Events' : filter === 'success' ? 'Success Only' : 'Failures Only'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRange(timeRange === 'day' ? 'week' : timeRange === 'week' ? 'month' : 'day')}
              >
                <Clock className="h-4 w-4 mr-2" />
                {timeRange === 'day' ? 'Last Day' : timeRange === 'week' ? 'Last Week' : 'Last Month'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAuditLogs}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security events found for the selected criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <Badge className={getActionTypeColor(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="font-medium">
                        {log.user_id ? (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            User: {log.user_id.slice(0, 8)}...
                          </span>
                        ) : (
                          'System Event'
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          Error: {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Show details in a modal or expand
                        console.log('Log details:', log);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Actions */}
      {securityStats?.topActions && securityStats.topActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Frequent Actions</CardTitle>
            <CardDescription>Top security events in the selected time range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityStats.topActions.map((action: any, index: number) => (
                <div key={action.action_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <Badge className={getActionTypeColor(action.action_type)}>
                      {formatActionType(action.action_type)}
                    </Badge>
                  </div>
                  <span className="font-medium">{action.count} events</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityDashboard; 