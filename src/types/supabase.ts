import { SupabaseClient } from '@supabase/supabase-js';

export interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  total_votes: number;
  total_registered: number;
  encryption_keys: {
    publicKey: {
      n: string;
      g: string;
    };
    privateKey: {
      lambda: string;
      mu: string;
      n: string;
    };
  };
  merkle_root?: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  election_id: string;
  name: string;
  party: string;
  symbol: string;
  votes: number;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  election_id: string;
  voter_did: string;
  encrypted_vote: string;
  timestamp: string;
  merkle_proof?: {
    root: string;
    proof: string[];
    leaf: string;
    index: number;
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  address: string;
  did: string;
  email: string;
  name: string;
  dob: string;
  has_voted: boolean;
  vote_receipt?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      elections: {
        Row: Election;
        Insert: Omit<Election, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Election, 'id' | 'created_at' | 'updated_at'>>;
      };
      candidates: {
        Row: Candidate;
        Insert: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Candidate, 'id' | 'created_at' | 'updated_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at' | 'updated_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type SupabaseDB = SupabaseClient<Database>;
