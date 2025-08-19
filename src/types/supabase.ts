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
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          logo_url: string | null;
          settings: any;
          subscription_tier: string;
          max_users: number;
          max_elections: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: any;
          subscription_tier?: string;
          max_users?: number;
          max_elections?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: any;
          subscription_tier?: string;
          max_users?: number;
          max_elections?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_admins: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          email: string;
          name: string;
          role: string;
          permissions: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          email: string;
          name: string;
          role?: string;
          permissions?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          email?: string;
          name?: string;
          role?: string;
          permissions?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      auth_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          organization_id: string;
          role: string;
          is_verified: boolean;
          verification_token: string | null;
          reset_token: string | null;
          reset_token_expires: string | null;
          last_login: string | null;
          login_attempts: number;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          organization_id: string;
          role?: string;
          is_verified?: boolean;
          verification_token?: string | null;
          reset_token?: string | null;
          reset_token_expires?: string | null;
          last_login?: string | null;
          login_attempts?: number;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          organization_id?: string;
          role?: string;
          is_verified?: boolean;
          verification_token?: string | null;
          reset_token?: string | null;
          reset_token_expires?: string | null;
          last_login?: string | null;
          login_attempts?: number;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          organization_id: string;
          ip_address: string | null;
          user_agent: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token: string;
          organization_id: string;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          organization_id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          address: string;
          did: string;
          email: string;
          name: string;
          dob: string;
          has_voted: boolean;
          vote_receipt: string | null;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          did: string;
          email: string;
          name: string;
          dob: string;
          has_voted?: boolean;
          vote_receipt?: string | null;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          did?: string;
          email?: string;
          name?: string;
          dob?: string;
          has_voted?: boolean;
          vote_receipt?: string | null;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      elections: {
        Row: {
          id: string;
          name: string;
          start_time: string;
          end_time: string;
          is_active: boolean;
          total_votes: number;
          total_registered: number;
          encryption_keys: any;
          merkle_root: string | null;
          blockchain_tx_hash: string | null;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          total_votes?: number;
          total_registered?: number;
          encryption_keys?: any;
          merkle_root?: string | null;
          blockchain_tx_hash?: string | null;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          total_votes?: number;
          total_registered?: number;
          encryption_keys?: any;
          merkle_root?: string | null;
          blockchain_tx_hash?: string | null;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      candidates: {
        Row: {
          id: string;
          election_id: string;
          name: string;
          party: string;
          symbol: string;
          votes: number;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          election_id: string;
          name: string;
          party: string;
          symbol: string;
          votes?: number;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          name?: string;
          party?: string;
          symbol?: string;
          votes?: number;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          election_id: string;
          candidate_id: string;
          voter_did: string;
          encrypted_vote: string;
          merkle_proof: any;
          organization_id: string;
          created_at: string;
          updated_at: string;
      };
        Insert: {
          id?: string;
          election_id: string;
          candidate_id: string;
          voter_did: string;
          encrypted_vote: string;
          merkle_proof?: any;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          election_id?: string;
          candidate_id?: string;
          voter_did?: string;
          encrypted_vote?: string;
          merkle_proof?: any;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
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
