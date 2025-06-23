import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { registerUser, verifyRegistration } from '@/lib/api/auth';
import { createElection, addCandidate } from '@/lib/api/election';
import { castVote, verifyVote } from '@/lib/api/voting';

describe('Voting Flow Integration', () => {
  const testUser = {
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    email: 'test@example.com',
    name: 'Test User',
    dob: '1990-01-01',
  };

  const testCandidate = {
    name: 'Test Candidate',
    party: 'Test Party',
    symbol: '🎯',
  };

  let electionId: string;
  let userDID: string;

  beforeEach(async () => {
    // Clean up test data
    await supabase.from('votes').delete().neq('id', '0');
    await supabase.from('candidates').delete().neq('id', '0');
    await supabase.from('elections').delete().neq('id', '0');
    await supabase.from('users').delete().neq('id', '0');

    // Create test election
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 1 day later
    const { data: election } = await createElection(startTime, endTime);
    if (!election) throw new Error('Failed to create test election');
    electionId = election.id;

    // Add test candidate
    await addCandidate(electionId, testCandidate.name, testCandidate.party, testCandidate.symbol);
  });

  describe('Complete Voting Flow', () => {
    it('should allow a user to register, verify, vote, and verify their vote', async () => {
      // Step 1: Register user
      const { user, otpSent } = await registerUser(
        testUser.address,
        testUser.email,
        testUser.name,
        testUser.dob
      );
      expect(otpSent).toBe(true);
      expect(user).toBeDefined();
      if (!user) throw new Error('Failed to register user');
      userDID = user.did;

      // Step 2: Verify registration with OTP
      const verifiedUser = await verifyRegistration(testUser.email, '123456'); // Mock OTP
      expect(verifiedUser).toBeDefined();
      if (!verifiedUser) throw new Error('Failed to verify user');
      expect(verifiedUser.did).toBe(userDID);

      // Step 3: Cast vote
      const mockSigner = {
        signMessage: async (message: string) => 'mock_signature',
      };
      const { voteId, merkleProof } = await castVote(electionId, userDID, 1, mockSigner);
      expect(voteId).toBeDefined();
      expect(merkleProof).toBeDefined();

      // Step 4: Verify vote
      const verification = await verifyVote(voteId);
      expect(verification.status).toBe('valid');
      expect(verification.merkleProof).toBeDefined();
      expect(verification.merkleRoot).toBeDefined();
    });

    it('should prevent double voting', async () => {
      // Register and verify user first
      const { user } = await registerUser(
        testUser.address,
        testUser.email,
        testUser.name,
        testUser.dob
      );
      if (!user) throw new Error('Failed to register user');
      await verifyRegistration(testUser.email, '123456'); // Mock OTP
      userDID = user.did;

      // Cast first vote
      const mockSigner = {
        signMessage: async (message: string) => 'mock_signature',
      };
      await castVote(electionId, userDID, 1, mockSigner);

      // Attempt second vote
      await expect(
        castVote(electionId, userDID, 1, mockSigner)
      ).rejects.toThrow();
    });

    it('should maintain vote privacy', async () => {
      // Register and verify user
      const { user } = await registerUser(
        testUser.address,
        testUser.email,
        testUser.name,
        testUser.dob
      );
      if (!user) throw new Error('Failed to register user');
      await verifyRegistration(testUser.email, '123456'); // Mock OTP
      userDID = user.did;

      // Cast vote
      const mockSigner = {
        signMessage: async (message: string) => 'mock_signature',
      };
      const { voteId } = await castVote(electionId, userDID, 1, mockSigner);

      // Get vote directly from database
      const { data: vote, error } = await supabase
        .from('votes')
        .select('encrypted_vote')
        .eq('id', voteId)
        .single();

      if (error) throw error;
      if (!vote) throw new Error('Failed to fetch vote');

      // Verify that the stored vote is encrypted
      expect(vote.encrypted_vote).toBeDefined();
      expect(vote.encrypted_vote).not.toBe('1');
      expect(vote.encrypted_vote.length).toBeGreaterThan(32);
    });
  });
}); 