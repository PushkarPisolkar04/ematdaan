const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export interface InvitationData {
  emails: string[];
  organizationId: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  invitation_token: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationStats {
  total_invitations: number;
  used_invitations: number;
  pending_invitations: number;
  expired_invitations: number;
}

export const invitationApi = {
  async createInvitations(invitationData: InvitationData): Promise<{ success: boolean; count: number; invitations: Invitation[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/create-from-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating invitations:', error);
      throw error;
    }
  },

  async getInvitations(organizationId: string): Promise<Invitation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/organization/${organizationId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }

      const data = await response.json();
      return data.invitations || [];
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  },

  async getInvitationStats(organizationId: string): Promise<InvitationStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/stats/${organizationId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invitation stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching invitation stats:', error);
      throw error;
    }
  },

  async validateInvitationToken(token: string): Promise<any> {
    try {
      const encodedToken = encodeURIComponent(token);
      const url = `${API_BASE_URL}/api/invitations/validate/${encodedToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate invitation token');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}; 