import { disconnectSocket } from './socket';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let idleTimer: number | null = null;

const resetIdleTimer = () => {
  if (idleTimer) {
    window.clearTimeout(idleTimer);
  }
  idleTimer = window.setTimeout(handleIdleTimeout, IDLE_TIMEOUT);
};

const handleIdleTimeout = () => {
  // Clear session data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Disconnect WebSocket
  disconnectSocket();

  // Disconnect MetaMask
  if (window.ethereum) {
    window.ethereum.request({
      method: 'eth_requestAccounts',
      params: []
    }).catch(console.error);
  }

  // Redirect to home
  window.location.href = '/';
};

export const initializeSessionManager = () => {
  // Reset timer on user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetIdleTimer);
  });

  // Initial timer
  resetIdleTimer();

  // Cleanup on unmount
  return () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
    }
    events.forEach(event => {
      document.removeEventListener(event, resetIdleTimer);
    });
  };
};

export const clearSession = () => {
  if (idleTimer) {
    window.clearTimeout(idleTimer);
    idleTimer = null;
  }
  handleIdleTimeout();
}; 