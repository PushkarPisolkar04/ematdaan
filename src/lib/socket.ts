// Socket.io disabled for now to prevent connection errors
export const initializeSocket = () => null;
export const subscribeToElectionUpdates = (callback: (data: any) => void) => () => {};
export const subscribeToVoteUpdates = (callback: (data: any) => void) => () => {};
export const disconnectSocket = () => {}; 