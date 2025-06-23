import { supabase } from '@/lib/supabase';
import { encryptVote, addEncryptedVotes } from '@/lib/encryption';
import { createMerkleTree, getMerkleProof } from '@/lib/merkle';
import { signMessage } from '@/lib/metamask';
import type { Vote, VoteReceipt } from '@/types';
import { createPublicKey } from '@/lib/encryption';

export const hasVotedInElection = async (
  voterDID: string,
  electionId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('has_voted_in_election', {
        p_voter_did: voterDID,
        p_election_id: electionId
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking vote status:', error);
    throw error;
  }
};

export const castVote = async (
  electionId: string,
  voterDID: string,
  candidateId: string,
  signer: any
) => {
  try {
    // Check if user has already voted in this election
    const hasVoted = await hasVotedInElection(voterDID, electionId);
    if (hasVoted) {
      throw new Error('You have already voted in this election');
    }

    // Get election data with candidates
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select(`
        encryption_keys,
        candidates (
          id
        )
      `)
      .eq('id', electionId)
      .single();

    if (electionError) throw electionError;

    // Find candidate index in the array
    const candidateIndex = election.candidates.findIndex(c => c.id === candidateId);
    if (candidateIndex === -1) {
      throw new Error('Invalid candidate');
    }

    // Create public key from election keys
    const publicKey = createPublicKey(
      BigInt(election.encryption_keys.publicKey.n),
      BigInt(election.encryption_keys.publicKey.g)
    );

    // Encrypt vote using candidate index
    const encryptedVote = await encryptVote(BigInt(candidateIndex + 1), publicKey);

    // Sign encrypted vote
    const signature = await signMessage(encryptedVote, signer);

    // Store vote in database
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert({
        election_id: electionId,
        voter_did: voterDID,
        encrypted_vote: encryptedVote,
        signature: signature,
        candidate_id: candidateId,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    console.log('Vote insert result:', { vote, voteError });

    if (voteError) {
      console.error('Vote insert error:', voteError);
      throw new Error(`Failed to insert vote: ${voteError.message}`);
    }

    let finalVote = vote;
    if (!finalVote) {
      console.log('Vote insert succeeded but returned no data, fetching vote...');
      // Fetch the vote we just inserted
      const { data: insertedVote, error: fetchError } = await supabase
        .from('votes')
        .select('*')
        .eq('election_id', electionId)
        .eq('voter_did', voterDID)
        .eq('encrypted_vote', encryptedVote)
        .single();

      if (fetchError) {
        console.error('Failed to fetch inserted vote:', fetchError);
        throw new Error(`Vote was inserted but could not be retrieved: ${fetchError.message}`);
      }
      
      if (!insertedVote) {
        throw new Error('Vote was inserted but could not be found. This should not happen.');
      }

      finalVote = insertedVote;
    }

    // Get all votes for Merkle tree
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('encrypted_vote')
      .eq('election_id', electionId);

    if (votesError) throw votesError;

    // Create Merkle tree and get proof
    const merkleTree = createMerkleTree(votes.map(v => v.encrypted_vote));
    const merkleProof = getMerkleProof(merkleTree, encryptedVote, votes.length - 1);

    // Update vote with Merkle proof
    const { error: updateError } = await supabase
      .from('votes')
      .update({
        merkle_proof: merkleProof,
      })
      .eq('id', finalVote.id);

    if (updateError) throw updateError;

    // Update election Merkle root
    const { error: rootError } = await supabase
      .from('elections')
      .update({
        merkle_root: merkleProof.root,
      })
      .eq('id', electionId);

    if (rootError) throw rootError;

    // Mark user as voted
    const { error: userError } = await supabase
      .from('users')
      .update({
        has_voted: true,
        vote_receipt: finalVote.id,
      })
      .eq('did', voterDID);

    if (userError) throw userError;

    // Increment candidate vote count using raw SQL
    const { error: candidateError } = await supabase
      .rpc('increment_candidate_votes', {
        p_candidate_id: candidateId,
        p_election_id: electionId
      });

    if (candidateError) throw candidateError;

    return {
      voteId: finalVote.id,
      merkleProof,
      signature,
    };
  } catch (error) {
    throw error;
  }
};

export const verifyVote = async (receiptHash: string) => {
  try {
    // Get vote by receipt hash, join election and candidate
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select(`
        *,
        elections!inner (
          start_time,
          end_time,
          merkle_root
        ),
        candidates (
          name,
          party,
          symbol
        )
      `)
      .eq('id', receiptHash)
      .single();

    if (voteError) throw voteError;

    return {
      status: 'valid',
      merkleProof: vote.merkle_proof,
      merkleRoot: vote.elections.merkle_root,
      timestamp: vote.timestamp,
      electionId: vote.election_id,
      votedFor: vote.candidates?.name || undefined,
      candidateParty: vote.candidates?.party || undefined,
      candidateSymbol: vote.candidates?.symbol || undefined,
    };
  } catch (error) {
    return { status: 'invalid' };
  }
}; 