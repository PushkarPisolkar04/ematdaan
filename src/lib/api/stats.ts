export interface PlatformStats {
  totalVotes: number;
  totalUsers: number;
  activeElections: number;
  totalElections: number; // This represents completed elections
}

export const fetchPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/stats/platform`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch platform stats');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Return default values on error
    return {
      totalVotes: 0,
      totalUsers: 0,
      activeElections: 0,
      totalElections: 0
    };
  }
};

export const fetchTodayStats = async (): Promise<{ votesToday: number; usersToday: number }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/stats/today`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch today stats');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return {
      votesToday: 0,
      usersToday: 0
    };
  }
}; 