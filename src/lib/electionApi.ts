const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export interface ElectionData {
  name: string;
  startTime: string;
  endTime: string;
  organizationId: string;
}

export interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  candidates?: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
}

export const electionApi = {
  async createElection(electionData: ElectionData): Promise<Election> {
    const response = await fetch(`${API_BASE_URL}/api/elections/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(electionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create election');
    }

    const result = await response.json();
    return result.data;
  },

  async getElections(organizationId: string): Promise<Election[]> {
    const response = await fetch(`${API_BASE_URL}/api/elections/organization/${organizationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get elections');
    }

    const result = await response.json();
    return result.data;
  },

  async getActiveElections(organizationId: string): Promise<Election[]> {
    const response = await fetch(`${API_BASE_URL}/api/elections/active/${organizationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get active elections');
    }

    const result = await response.json();
    return result.data;
  },

  async getElection(electionId: string): Promise<Election> {
    const response = await fetch(`${API_BASE_URL}/api/elections/${electionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get election');
    }

    const result = await response.json();
    return result.data;
  },

  async updateElection(electionId: string, updateData: Partial<ElectionData & { isActive?: boolean }>): Promise<Election> {
    const response = await fetch(`${API_BASE_URL}/api/elections/${electionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update election');
    }

    const result = await response.json();
    return result.data;
  },

  async deleteElection(electionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/elections/${electionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete election');
    }
  },
}; 