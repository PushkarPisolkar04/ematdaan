const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export interface CandidateData {
  name: string;
  party: string;
  symbol: string;
  electionId: string;
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  election_id: string;
  created_at: string;
}

export const candidateApi = {
  async createCandidate(candidateData: CandidateData): Promise<Candidate> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create candidate');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - server not responding');
      }
      throw error;
    }
  },

  async getCandidates(electionId: string): Promise<Candidate[]> {
    const response = await fetch(`${API_BASE_URL}/api/candidates/election/${electionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get candidates');
    }

    const result = await response.json();
    return result.data;
  },

  async updateCandidate(candidateId: string, updateData: { name: string; party: string; symbol: string }): Promise<Candidate> {
    const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update candidate');
    }

    const result = await response.json();
    return result.data;
  },

  async deleteCandidate(candidateId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete candidate');
    }
  },
}; 