import { describe, it, expect } from 'vitest';
import { generateKey, encryptVote, addEncryptedVotes } from './encryption';

describe('Encryption Module', () => {
  describe('generateKey', () => {
    it('should generate valid key pair', async () => {
      const keys = await generateKey();
      
      expect(keys).toHaveProperty('publicKey');
      expect(keys).toHaveProperty('privateKey');
      expect(keys.publicKey).toHaveProperty('n');
      expect(keys.publicKey).toHaveProperty('g');
      expect(keys.privateKey).toHaveProperty('lambda');
      expect(keys.privateKey).toHaveProperty('mu');
      expect(keys.privateKey).toHaveProperty('n');
    });
  });

  describe('encryptVote', () => {
    it('should encrypt a vote with public key', async () => {
      const keys = await generateKey();
      const vote = BigInt(1);
      
      const encrypted = await encryptVote(vote, keys.publicKey);
      
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same vote', async () => {
      const keys = await generateKey();
      const vote = BigInt(1);
      
      const encrypted1 = await encryptVote(vote, keys.publicKey);
      const encrypted2 = await encryptVote(vote, keys.publicKey);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('addEncryptedVotes', () => {
    it('should homomorphically add encrypted votes', async () => {
      const keys = await generateKey();
      const vote1 = BigInt(1);
      const vote2 = BigInt(1);
      
      const encrypted1 = await encryptVote(vote1, keys.publicKey);
      const encrypted2 = await encryptVote(vote2, keys.publicKey);
      
      const sum = await addEncryptedVotes([encrypted1, encrypted2], keys.publicKey);
      
      expect(typeof sum).toBe('string');
      expect(sum.length).toBeGreaterThan(0);
      expect(sum).not.toBe(encrypted1);
      expect(sum).not.toBe(encrypted2);
    });

    it('should handle empty array of votes', async () => {
      const keys = await generateKey();
      
      await expect(addEncryptedVotes([], keys.publicKey)).rejects.toThrow();
    });
  });
}); 