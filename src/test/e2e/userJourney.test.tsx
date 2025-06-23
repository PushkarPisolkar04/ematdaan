import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { supabase } from '@/lib/supabase';

interface EthereumRequest {
  method: string;
  params?: any[];
}

// Mock MetaMask
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// Mock email service
vi.mock('@/lib/email', () => ({
  sendOTP: vi.fn().mockResolvedValue({ success: true, message: 'OTP sent' }),
  verifyOTP: vi.fn().mockResolvedValue({ success: true, message: 'OTP verified' }),
}));

// Use MemoryRouter for test isolation
const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('User Journey E2E', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.ethereum
    global.window.ethereum = mockEthereum;
    
    // Mock MetaMask connection
    mockEthereum.request.mockImplementation(async ({ method }: EthereumRequest) => {
      switch (method) {
        case 'eth_requestAccounts':
          return ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e'];
        case 'eth_chainId':
          return '0x1';
        case 'personal_sign':
          return '0x...'; // Mock signature
        default:
          return null;
      }
    });

    // Clean up test data
    return Promise.all([
      supabase.from('votes').delete().neq('id', '0'),
      supabase.from('candidates').delete().neq('id', '0'),
      supabase.from('elections').delete().neq('id', '0'),
      supabase.from('users').delete().neq('id', '0'),
    ]);
  });

  it('should complete the full user journey', async () => {
    const user = userEvent.setup();

    // Render app
    renderWithRouter(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Step 1: Connect MetaMask
    const connectButton = screen.getByText(/connect metamask/i);
    await user.click(connectButton);
    
    await waitFor(() => {
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    // Step 2: Fill registration form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const dobInput = screen.getByLabelText(/date of birth/i);

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(dobInput, '1990-01-01');

    const registerButton = screen.getByText(/register/i);
    await user.click(registerButton);

    // Step 3: Enter OTP
    const otpInput = await screen.findByLabelText(/enter otp/i);
    await user.type(otpInput, '123456');

    const verifyButton = screen.getByText(/verify otp/i);
    await user.click(verifyButton);

    // Step 4: Navigate to voting page
    const voteButton = await screen.findByText(/start voting/i);
    await user.click(voteButton);

    // Step 5: Select candidate and cast vote
    const candidateCard = await screen.findByText(/test candidate/i);
    await user.click(candidateCard);

    const confirmVoteButton = screen.getByText(/confirm vote/i);
    await user.click(confirmVoteButton);

    // Step 6: Sign vote with MetaMask
    await waitFor(() => {
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [expect.any(String), expect.any(String)],
      });
    });

    // Step 7: Verify success message
    await waitFor(() => {
      expect(screen.getByText(/vote cast successfully/i)).toBeInTheDocument();
    });

    // Step 8: Navigate to verification page
    const verifyVoteButton = screen.getByText(/verify vote/i);
    await user.click(verifyVoteButton);

    // Step 9: Check vote verification
    const voteReceipt = screen.getByText(/merkle proof/i);
    expect(voteReceipt).toBeInTheDocument();

    // Step 10: Check vote privacy
    const encryptedVote = screen.getByText(/encrypted vote/i);
    expect(encryptedVote).toBeInTheDocument();
    expect(encryptedVote).not.toHaveTextContent(/test candidate/i);
  });

  it('should handle errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock MetaMask error
    mockEthereum.request.mockRejectedValueOnce(new Error('User rejected'));

    renderWithRouter(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Try to connect MetaMask
    const connectButton = screen.getByText(/connect metamask/i);
    await user.click(connectButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument();
    });
  });

  it('should prevent voting after election ends', async () => {
    const user = userEvent.setup();

    // Set up expired election
    const startTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
    const endTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

    await supabase.from('elections').insert({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      is_active: true,
    });

    renderWithRouter(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Try to access voting page
    const voteButton = screen.getByText(/start voting/i);
    await user.click(voteButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/voting has ended/i)).toBeInTheDocument();
    });
  });
}); 