import { DIDDocument } from '@/lib/did';
import { KeyPair } from '@/lib/encryption';

export interface User {
  address: string;
  did: DIDDocument;
  email: string;
  name: string;
  dob: string;
  hasVoted: boolean;
  voteReceipt?: string;
}

export interface Candidate {
  id: number;
  name: string;
  party: string;
  symbol: string;
  votes?: number;
}

export interface Election {
  id: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  candidates: Candidate[];
  totalVotes: number;
  encryptionKeys: KeyPair;
  merkleRoot?: string;
}

export interface Vote {
  id: string;
  electionId: string;
  voterDID: string;
  encryptedVote: string;
  timestamp: Date;
  merkleProof?: {
    root: string;
    proof: string[];
    leaf: string;
    index: number;
  };
}

export interface VoteReceipt {
  id: string;
  electionId: string;
  voterDID: string;
  candidateId: number;
  timestamp: Date;
  merkleProof: {
    root: string;
    proof: string[];
    leaf: string;
    index: number;
  };
}

export interface ElectionStats {
  totalRegistered: number;
  totalVoted: number;
  votingProgress: number;
  activeVoters: number;
  candidateResults: {
    candidateId: number;
    votes: number;
    percentage: number;
  }[];
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    name: string;
    email: string;
    dob: string;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    signature: string;
  };
} 