import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = accounts[0];

    // Simple admin check using environment variable
    const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
    const isAdmin = adminAddress && address.toLowerCase() === adminAddress.toLowerCase();

    // Store in localStorage
    localStorage.setItem('wallet_address', address);
    localStorage.setItem('isConnected', 'true');
    
    if (isAdmin) {
      localStorage.setItem('isAdmin', 'true');
    }

    return { provider, signer, address, isAdmin };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('You rejected the connection request');
    }
    throw new Error('Failed to connect to MetaMask');
  }
};

export const disconnectMetaMask = async () => {
  try {
    // Clear all auth-related data
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('isConnected');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userDID');
    localStorage.removeItem('auth');
  } catch (error) {
    console.error('Error disconnecting:', error);
  }
};

export const getCurrentAddress = async () => {
  if (!window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting current address:', error);
    return null;
  }
};

export const checkConnection = async () => {
  if (!window.ethereum) {
    return false;
  }

  try {
    const isConnected = localStorage.getItem('isConnected') === 'true';
    const storedAddress = localStorage.getItem('wallet_address');
    const storedAuth = localStorage.getItem('auth');
    
    if (!isConnected || !storedAddress) {
      return false;
    }

    // Get current accounts
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const currentAddress = accounts[0];

    if (!currentAddress || currentAddress.toLowerCase() !== storedAddress.toLowerCase()) {
      // Clear invalid connection state
      await disconnectMetaMask();
      return false;
    }

    // If we have auth data, verify it matches
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      if (parsedAuth.address?.toLowerCase() !== currentAddress.toLowerCase()) {
        await disconnectMetaMask();
        return false;
      }
    }

    // Connection is valid
    return true;
  } catch (error) {
    console.error('Error checking connection:', error);
    return false;
  }
};

export const signMessage = async (message: string, signer: ethers.Signer) => {
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    throw new Error('Failed to sign message');
  }
};

export const verifySignature = (message: string, signature: string, address: string) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    throw new Error('Failed to verify signature');
  }
};

export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
};

// Listen for account changes
export const onAccountsChanged = (callback: (accounts: string[]) => void) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  window.ethereum.on('accountsChanged', callback);
  return () => {
    window.ethereum.removeListener('accountsChanged', callback);
  };
};

// Listen for chain changes
export const onChainChanged = (callback: (chainId: string) => void) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  window.ethereum.on('chainChanged', callback);
  return () => {
    window.ethereum.removeListener('chainChanged', callback);
  };
}; 