import { supabase } from './supabase';

// Vote encryption and security utilities
export interface EncryptedVote {
  encrypted_data: string;
  signature: string;
  public_key: string;
  timestamp: string;
  election_id: string;
  voter_id: string;
}

export interface VoteReceipt {
  receipt_id: string;
  election_id: string;
  timestamp: string;
  merkle_proof: string[];
  merkle_root: string;
}

// Generate a unique voter key pair for each election
export const generateVoterKeys = async (electionId: string, voterId: string): Promise<CryptoKeyPair> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  
  // Store the private key securely (in production, use more secure storage)
  const privateKeyData = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyString = btoa(String.fromCharCode(...new Uint8Array(privateKeyData)));
  
  localStorage.setItem(`vote_key_${electionId}_${voterId}`, privateKeyString);
  
  return keyPair;
};

// Encrypt vote data
export const encryptVote = async (
  voteData: any, 
  electionId: string, 
  voterId: string
): Promise<EncryptedVote> => {
  // Generate encryption key
  const encryptionKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Generate voter signature key
  const voterKeys = await generateVoterKeys(electionId, voterId);
  
  // Create vote payload
  const votePayload = {
    candidate_id: voteData.candidate_id,
    election_id: electionId,
    voter_id: voterId,
    timestamp: new Date().toISOString(),
    random_salt: crypto.getRandomValues(new Uint8Array(16))
  };

  // Convert to JSON and encrypt
  const voteJson = JSON.stringify(votePayload);
  const voteBuffer = new TextEncoder().encode(voteJson);
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the vote
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    voteBuffer
  );

  // Export encryption key for storage
  const exportedKey = await window.crypto.subtle.exportKey('raw', encryptionKey);
  const keyString = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  
  // Create signature
  const signatureData = new TextEncoder().encode(
    JSON.stringify({
      encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      election_id: electionId,
      voter_id: voterId,
      timestamp: votePayload.timestamp
    })
  );
  
  const signature = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    voterKeys.privateKey,
    signatureData
  );

  // Export public key
  const publicKeyData = await window.crypto.subtle.exportKey('spki', voterKeys.publicKey);
  const publicKeyString = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)));

  return {
    encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
    public_key: publicKeyString,
    timestamp: votePayload.timestamp,
    election_id: electionId,
    voter_id: voterId
  };
};

// Verify vote integrity
export const verifyVote = async (encryptedVote: EncryptedVote): Promise<boolean> => {
  try {
    // Import public key
    const publicKeyData = Uint8Array.from(atob(encryptedVote.public_key), c => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyData,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['verify']
    );

    // Recreate signature data
    const signatureData = new TextEncoder().encode(
      JSON.stringify({
        encrypted_data: encryptedVote.encrypted_data,
        election_id: encryptedVote.election_id,
        voter_id: encryptedVote.voter_id,
        timestamp: encryptedVote.timestamp
      })
    );

    // Verify signature
    const signature = Uint8Array.from(atob(encryptedVote.signature), c => c.charCodeAt(0));
    return await window.crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signature,
      signatureData
    );
  } catch (error) {
    console.error('Vote verification failed:', error);
    return false;
  }
};

// Generate Merkle tree for vote verification
export const generateMerkleTree = async (votes: EncryptedVote[]): Promise<{
  root: string;
  proofs: Map<string, string[]>;
}> => {
  if (votes.length === 0) {
    return { root: '', proofs: new Map() };
  }

  // Create leaf nodes (hashes of encrypted votes)
  const leaves = await Promise.all(
    votes.map(async (vote) => {
      const voteData = JSON.stringify(vote);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(voteData));
      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    })
  );

  // Build Merkle tree
  const buildTree = async (nodes: string[]): Promise<{
    root: string;
    proofs: Map<string, string[]>;
  }> => {
    if (nodes.length === 1) {
      return { root: nodes[0], proofs: new Map() };
    }

    const newLevel: string[] = [];
    const proofs = new Map<string, string[]>();

    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : left;
      
      const combined = left + right;
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
      const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      
      newLevel.push(hash);

      // Store proof for left node
      if (i < nodes.length) {
        proofs.set(left, [right, ...(proofs.get(left) || [])]);
      }
      
      // Store proof for right node
      if (i + 1 < nodes.length) {
        proofs.set(right, [left, ...(proofs.get(right) || [])]);
      }
    }

    const result = await buildTree(newLevel);
    
    // Merge proofs
    proofs.forEach((proof, node) => {
      const existingProof = result.proofs.get(node) || [];
      result.proofs.set(node, [...proof, ...existingProof]);
    });

    return result;
  };

  return buildTree(leaves);
};

// Verify vote inclusion in Merkle tree
export const verifyMerkleProof = async (
  voteHash: string,
  proof: string[],
  root: string
): Promise<boolean> => {
  let currentHash = voteHash;

  for (const sibling of proof) {
    const combined = currentHash + sibling;
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
    currentHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  return currentHash === root;
};

// Submit encrypted vote
export const submitEncryptedVote = async (
  encryptedVote: EncryptedVote
): Promise<{ success: boolean; receipt?: VoteReceipt; error?: string }> => {
  try {
    // Store encrypted vote
    const { data, error } = await supabase
      .from('encrypted_votes')
      .insert({
        election_id: encryptedVote.election_id,
        voter_id: encryptedVote.voter_id,
        encrypted_data: encryptedVote.encrypted_data,
        signature: encryptedVote.signature,
        public_key: encryptedVote.public_key,
        timestamp: encryptedVote.timestamp
      })
      .select()
      .single();

    if (error) throw error;

    // Generate receipt
    const receipt: VoteReceipt = {
      receipt_id: data.id,
      election_id: encryptedVote.election_id,
      timestamp: encryptedVote.timestamp,
      merkle_proof: [], // Will be populated when Merkle tree is generated
      merkle_root: '' // Will be populated when Merkle tree is generated
    };

    return { success: true, receipt };
  } catch (error) {
    console.error('Failed to submit encrypted vote:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Get vote receipt for verification
export const getVoteReceipt = async (
  receiptId: string
): Promise<VoteReceipt | null> => {
  try {
    const { data, error } = await supabase
      .from('encrypted_votes')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (error || !data) return null;

    // Get Merkle proof (this would be generated after all votes are cast)
    const { data: merkleData } = await supabase
      .from('merkle_trees')
      .select('*')
      .eq('election_id', data.election_id)
      .single();

    return {
      receipt_id: data.id,
      election_id: data.election_id,
      timestamp: data.timestamp,
      merkle_proof: merkleData?.proof || [],
      merkle_root: merkleData?.root || ''
    };
  } catch (error) {
    console.error('Failed to get vote receipt:', error);
    return null;
  }
}; 