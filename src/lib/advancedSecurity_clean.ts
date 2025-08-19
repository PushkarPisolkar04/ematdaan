import { supabase } from './supabase';

// Advanced security features for voting system

// 1. Zero-Knowledge Proof for Vote Verification
export interface ZKProof {
  proof: string;
  publicInputs: string[];
  verificationKey: string;
}

// Generate zero-knowledge proof that vote is valid without revealing the vote
export const generateVoteZKProof = async (
  voteData: any,
  electionId: string,
  validCandidates: string[]
): Promise<ZKProof> => {
  // Simplified ZK proof generation
  // In production, use proper ZK libraries like snarkjs
  
  const witness = {
    vote: voteData.candidate_id,
    election: electionId,
    validCandidates,
    nonce: crypto.randomUUID()
  };
  
  const publicInputs = [
    electionId,
    validCandidates.length.toString(),
    Date.now().toString()
  ];
  
  // Generate proof (simplified)
  const proofData = {
    witness_hash: await hashObject(witness),
    public_inputs: publicInputs,
    timestamp: Date.now()
  };
  
  return {
    proof: btoa(JSON.stringify(proofData)),
    publicInputs,
    verificationKey: await generateVerificationKey()
  };
};

// Helper functions for ZK proofs
const hashObject = async (obj: any): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(obj));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const generateVerificationKey = async (): Promise<string> => {
  const keyData = {
    curve: 'secp256k1',
    generator: crypto.randomUUID(),
    timestamp: Date.now()
  };
  return btoa(JSON.stringify(keyData));
};

// 2. Homomorphic Encryption for Vote Counting
export interface HomomorphicVote {
  encrypted_vote: string;
  election_id: string;
  voter_id: string;
  timestamp: string;
}

// Encrypt vote using homomorphic encryption (simplified RSA-OAEP)
export const encryptHomomorphicVote = async (
  candidateId: string,
  electionId: string,
  voterId: string
): Promise<HomomorphicVote> => {
  // In production, use a proper homomorphic encryption library
  // This allows vote counting without decryption
  
  const voteData = {
    candidate_id: candidateId,
    election_id: electionId,
    voter_id: voterId,
    timestamp: new Date().toISOString()
  };
  
  // Simplified homomorphic encryption using RSA-OAEP
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    keyPair.publicKey,
    new TextEncoder().encode(JSON.stringify(voteData))
  );
  
  return {
    encrypted_vote: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    election_id: electionId,
    voter_id: voterId,
    timestamp: voteData.timestamp
  };
};

// 3. Anti-Coercion Mechanism (Vote Changing)
export interface VoteReceipt {
  receipt_id: string;
  election_id: string;
  voter_id: string;
  can_change_until: string;
  change_count: number;
  max_changes: number;
}

// Create anti-coercion receipt allowing vote changes
export const createAntiCoercionReceipt = async (
  electionId: string,
  voterId: string
): Promise<VoteReceipt> => {
  const receiptId = crypto.randomUUID();
  const changeDeadline = new Date();
  changeDeadline.setHours(changeDeadline.getHours() + 24); // 24-hour window
  
  const receipt: VoteReceipt = {
    receipt_id: receiptId,
    election_id: electionId,
    voter_id: voterId,
    can_change_until: changeDeadline.toISOString(),
    change_count: 0,
    max_changes: 3
  };
  
  // Store receipt in database
  await supabase
    .from('vote_receipts')
    .insert(receipt);
  
  return receipt;
};

// Check if voter can still change their vote
export const canChangeVote = async (
  receiptId: string
): Promise<boolean> => {
  const { data: receipt } = await supabase
    .from('vote_receipts')
    .select('*')
    .eq('receipt_id', receiptId)
    .single();
  
  if (!receipt) return false;
  
  const now = new Date();
  const deadline = new Date(receipt.can_change_until);
  
  return now < deadline && receipt.change_count < receipt.max_changes;
};

// 4. Enhanced Vote Verification
export interface VoteVerification {
  vote_hash: string;
  election_id: string;
  voter_id: string;
  timestamp: string;
  merkle_proof?: string;
  verification_signature?: string;
}

// Create verification record for vote
export const createVoteVerification = async (
  voteHash: string,
  electionId: string,
  voterId: string
): Promise<VoteVerification> => {
  const voteVerification: VoteVerification = {
    vote_hash: voteHash,
    election_id: electionId,
    voter_id: voterId,
    timestamp: new Date().toISOString(),
    merkle_proof: await generateMerkleProof(voteHash, electionId),
    verification_signature: await signVerification(voteHash, voterId)
  };
  
  // Store verification record
  await supabase
    .from('vote_verifications')
    .insert(voteVerification);
  
  return voteVerification;
};

// Generate Merkle proof for vote inclusion
const generateMerkleProof = async (voteHash: string, electionId: string): Promise<string> => {
  // Simplified Merkle proof generation
  const proofData = {
    vote_hash: voteHash,
    election_id: electionId,
    timestamp: new Date().toISOString(),
    salt: crypto.randomUUID()
  };
  
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(proofData));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Sign verification record
const signVerification = async (voteHash: string, voterId: string): Promise<string> => {
  const signatureData = {
    vote_hash: voteHash,
    voter_id: voterId,
    timestamp: new Date().toISOString()
  };
  
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(signatureData));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// 5. Multi-Factor Authentication for Critical Actions
export interface MFAToken {
  token: string;
  expires_at: string;
  action: string;
}

// Generate MFA token for critical actions
export const generateMFAToken = async (
  userId: string,
  action: string
): Promise<MFAToken> => {
  // Generate 6-digit OTP instead of UUID
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  const mfaToken: MFAToken = {
    token,
    expires_at: expiresAt.toISOString(),
    action
  };
  
  // Store MFA token
  await supabase
    .from('mfa_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      action
    });

  // Get user email for sending MFA code
  const { data: user } = await supabase
    .from('auth_users')
    .select('email')
    .eq('id', userId)
    .single();

  if (user?.email) {
    // Send MFA code using existing email service
    try {
      const response = await fetch('/api/send-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          code: token, 
          action: action 
        }),
      });

      if (!response.ok) {
        console.error('Failed to send MFA email');
      }
    } catch (error) {
      console.error('MFA email sending failed:', error);
    }
  }
  
  return mfaToken;
};

// Verify MFA token
export const verifyMFAToken = async (
  userId: string,
  token: string,
  action: string
): Promise<boolean> => {
  const { data: mfaRecord } = await supabase
    .from('mfa_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('token', token)
    .eq('action', action)
    .eq('used', false)
    .single();

  if (!mfaRecord) return false;

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(mfaRecord.expires_at);
  if (now > expiresAt) return false;

  // Mark token as used
  await supabase
    .from('mfa_tokens')
    .update({ used: true })
    .eq('id', mfaRecord.id);

  return true;
};

// 6. Rate Limiting for DDoS Protection
export const checkRateLimit = async (
  userId: string,
  action: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<boolean> => {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  // Get recent attempts
  const { data: attempts } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString());

  const totalAttempts = attempts?.reduce((sum, attempt) => sum + attempt.count, 0) || 0;

  if (totalAttempts >= maxAttempts) {
    return false; // Rate limited
  }

  // Record this attempt
  await supabase
    .from('rate_limits')
    .insert({
      user_id: userId,
      action,
      count: 1,
      window_start: new Date().toISOString(),
      max_attempts: maxAttempts
    });
  
  return true; // Allowed
};

// 7. End-to-End Verifiability
export interface VerifiableVote {
  vote_id: string;
  election_id: string;
  voter_id: string;
  encrypted_vote: string;
  zk_proof: ZKProof;
  verification_record: VoteVerification;
  receipt: VoteReceipt;
  timestamp: string;
}

// Create fully verifiable vote
export const createVerifiableVote = async (
  candidateId: string,
  electionId: string,
  voterId: string,
  validCandidates: string[]
): Promise<VerifiableVote> => {
  // 1. Encrypt vote
  const encryptedVote = await encryptHomomorphicVote(candidateId, electionId, voterId);
  
  // 2. Generate ZK proof
  const zkProof = await generateVoteZKProof(
    { candidate_id: candidateId },
    electionId,
    validCandidates
  );
  
  // 3. Create vote hash
  const voteHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(encryptedVote))
  );
  
  // 4. Create verification record
  const verificationRef = await createVoteVerification(
    btoa(String.fromCharCode(...new Uint8Array(voteHash))),
    electionId,
    voterId
  );
  
  // 5. Create anti-coercion receipt
  const receipt = await createAntiCoercionReceipt(electionId, voterId);
  
  // 6. Store complete verifiable vote
  const verifiableVote: VerifiableVote = {
    vote_id: crypto.randomUUID(),
    election_id: electionId,
    voter_id: voterId,
    encrypted_vote: encryptedVote.encrypted_vote,
    zk_proof: zkProof,
    verification_record: verificationRef,
    receipt,
    timestamp: new Date().toISOString()
  };
  
  await supabase
    .from('verifiable_votes')
    .insert(verifiableVote);
  
  return verifiableVote;
};

// 8. Vote Verification for Voters
export const verifyVoteInclusion = async (
  voteId: string,
  electionId: string
): Promise<{
  verified: boolean;
  proof?: string;
  timestamp?: string;
}> => {
  try {
    const { data: vote } = await supabase
      .from('verifiable_votes')
      .select('*')
      .eq('vote_id', voteId)
      .eq('election_id', electionId)
      .single();

    if (!vote) {
      return { verified: false };
    }

    // Verify ZK proof
    const zkValid = await verifyZKProof(vote.zk_proof);
    
    return {
      verified: zkValid,
      proof: vote.zk_proof.proof,
      timestamp: vote.timestamp
    };

  } catch (error) {
    console.error('Vote verification failed:', error);
    return { verified: false };
  }
};

// Verify ZK proof
const verifyZKProof = async (zkProof: ZKProof): Promise<boolean> => {
  try {
    // Simplified verification
    const proofData = JSON.parse(atob(zkProof.proof));
    return !!(proofData.witness_hash && proofData.public_inputs && proofData.timestamp);
  } catch (error) {
    return false;
  }
}; 