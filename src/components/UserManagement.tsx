import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  UserX,
  UserCheck,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
  is_locked: boolean;
  created_at: string;
  last_login?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchUsers = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = () => {
    const csvData = [
      ['Name', 'Email', 'Role', 'Status', 'Verified', 'Created At', 'Last Login'],
      ...users.map(user => [
        user.name,
        user.email,
        user.role,
        user.is_locked ? 'Locked' : 'Active',
        user.is_verified ? 'Yes' : 'No',
        new Date(user.created_at).toLocaleDateString(),
        user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${organization?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${users.length} users to CSV`,
    });
  };

  const parseImportData = (data: string) => {
    const lines = data.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredFields = ['name', 'email'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = values[index];
      });

      if (user.email && user.name) {
        users.push({
          name: user.name,
          email: user.email,
          role: user.role || 'voter'
        });
      }
    }

    return users;
  };

  const importUsers = async () => {
    if (!organization || !importData.trim()) return;

    setLoading(true);
    try {
      const usersToImport = parseImportData(importData);
      
      if (usersToImport.length === 0) {
        throw new Error('No valid users found in import data');
      }

      // Generate default passwords and hash them
      const usersWithPasswords = await Promise.all(
        usersToImport.map(async (user) => {
          const defaultPassword = 'TempPass123!'; // Users should change this
          const encoder = new TextEncoder();
          const data = encoder.encode(defaultPassword);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          return {
            ...user,
            password_hash: passwordHash,
            organization_id: organization.id,
            is_verified: false,
            verification_token: crypto.randomUUID()
          };
        })
      );

      const { data, error } = await supabase
        .from('auth_users')
        .insert(usersWithPasswords)
        .select();

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.length} users. Default password: TempPass123!`,
      });

      setImportData('');
      setShowImport(false);
      fetchUsers(); // Refresh the list

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('auth_users')
        .update({ is_locked: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User Status Updated",
        description: `User ${!currentStatus ? 'locked' : 'unlocked'} successfully`,
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('auth_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: "User has been permanently deleted",
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage users, import/export data, and control access</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline" disabled={loading}>
            <Users className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportUsers} variant="outline" disabled={users.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowImport(!showImport)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Users
          </Button>
        </div>
      </div>

      {/* Import Section */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Users
            </CardTitle>
            <CardDescription>
              Import users from CSV data. Required columns: Name, Email. Optional: Role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">CSV Data</label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Name,Email,Role&#10;John Doe,john@example.com,voter&#10;Jane Smith,jane@example.com,admin"
                className="w-full h-32 p-3 border rounded-md resize-none font-mono text-sm"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Import Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• First row should contain column headers</li>
                <li>• Required columns: Name, Email</li>
                <li>• Optional columns: Role (defaults to 'voter')</li>
                <li>• Default password will be: <strong>TempPass123!</strong></li>
                <li>• Users will need to verify their email and change password</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={importUsers} disabled={loading || !importData.trim()}>
                {loading ? 'Importing...' : 'Import Users'}
              </Button>
              <Button variant="outline" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B21E8] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found. Click "Refresh" to load users or "Import Users" to add them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${user.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.role}
                        </span>
                        {user.is_locked && (
                          <span className="px-2 py-1 rounded bg-red-100 text-red-800">Locked</span>
                        )}
                        {!user.is_verified && (
                          <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">Unverified</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(user.id, user.is_locked)}
                    >
                      {user.is_locked ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Lock
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement; 