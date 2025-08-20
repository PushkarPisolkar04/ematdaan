const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export interface RegisterWithInvitationData {
  token: string;
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
}

export const authApi = {
  async registerWithInvitation(data: RegisterWithInvitationData): Promise<{ success: boolean; user: User }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-with-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register with invitation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering with invitation:', error);
      throw error;
    }
  }
}; 