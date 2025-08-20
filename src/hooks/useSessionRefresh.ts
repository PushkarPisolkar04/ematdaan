import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useSessionRefresh = () => {
  const { refreshSession } = useAuth();
  const refreshInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Refresh session every 5 minutes
    refreshInterval.current = setInterval(async () => {
      await refreshSession();
    }, 5 * 60 * 1000);

    // Refresh on page focus (user comes back to tab)
    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession]);
}; 