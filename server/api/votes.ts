import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpcemfyksgaxthzzdwiv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Please set it in your environment variables.');
  console.error('You can get it from your Supabase Dashboard > Settings > API > service_role key');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey || 'invalid_key_will_cause_error');


router.post('/cast', async (req, res) => {
  try {
    const { candidateId, electionId, userId } = req.body;

    if (!candidateId || !electionId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: candidateId, electionId, userId'
      });
    }

    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .eq('election_id', electionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check existing vote error:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing vote',
        error: checkError.message
      });
    }

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election'
      });
    }

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('election_id', electionId)
      .single();

    if (candidateError || !candidate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate or candidate does not belong to this election'
      });
    }

    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, start_time, end_time, is_active')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return res.status(400).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (!election.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Election is not active'
      });
    }

    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Voting has not started yet'
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'Voting has ended'
      });
    }

    const voteHash = `${userId}-${electionId}-${Date.now()}`;

    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .insert([{
        candidate_id: candidateId,
        user_id: userId,
        election_id: electionId,
        vote_hash: voteHash
      }])
      .select()
      .single();

    if (voteError) {
      console.error('Vote casting error:', voteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to cast vote',
        error: voteError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: voteData
    });

  } catch (error) {
    console.error('Cast vote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/has-voted/:userId/:electionId', async (req, res) => {
  try {
    const { userId, electionId } = req.params;

    if (!userId || !electionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Election ID are required'
      });
    }

    const { data: vote, error } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .eq('election_id', electionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Check has voted error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check voting status',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      hasVoted: !!vote,
      data: vote
    });

  } catch (error) {
    console.error('Has voted check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/bulk-voting-status', async (req, res) => {
  try {
    const { userId, electionIds } = req.body;

    if (!userId || !electionIds || !Array.isArray(electionIds)) {
      return res.status(400).json({
        success: false,
        message: 'User ID and array of Election IDs are required'
      });
    }

    const { data: votes, error } = await supabase
      .from('votes')
      .select('election_id')
      .eq('user_id', userId)
      .in('election_id', electionIds);

    if (error) {
      console.error('Bulk voting status check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check voting status',
        error: error.message
      });
    }

    const votedElectionIds = new Set(votes?.map(vote => vote.election_id) || []);
    const votingStatus = electionIds.map(electionId => ({
      electionId,
      hasVoted: votedElectionIds.has(electionId)
    }));

    return res.status(200).json({
      success: true,
      data: votingStatus
    });

  } catch (error) {
    console.error('Bulk voting status check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/results/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required'
      });
    }


    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select(`
        id,
        name,
        party,
        symbol
      `)
      .eq('election_id', electionId);

    if (candidatesError) {
      console.error('Get candidates error:', candidatesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get candidates',
        error: candidatesError.message
      });
    }


    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('candidate_id')
      .eq('election_id', electionId);

    if (votesError) {
      console.error('Get votes error:', votesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get votes',
        error: votesError.message
      });
    }


    const voteCounts: { [key: string]: number } = {};
    votes?.forEach(vote => {
      voteCounts[vote.candidate_id] = (voteCounts[vote.candidate_id] || 0) + 1;
    });


    const results = candidates?.map(candidate => ({
      candidate: candidate,
      votes: voteCounts[candidate.id] || 0
    })) || [];

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Get vote results error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


router.get('/user-vote/:userId/:electionId', async (req, res) => {
  try {
    const { userId, electionId } = req.params;

    if (!userId || !electionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Election ID are required'
      });
    }


    const { data: vote, error } = await supabase
      .from('votes')
      .select(`
        id,
        vote_hash,
        created_at,
        candidates (
          id,
          name,
          party
        )
      `)
      .eq('user_id', userId)
      .eq('election_id', electionId)
      .single();

    if (error) {
      console.error('Get user vote error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user vote',
        error: error.message
      });
    }

    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'Vote not found'
      });
    }

      
    const voteData = {
      id: vote.id,
      vote_hash: vote.vote_hash,
      created_at: vote.created_at,
      candidate: Array.isArray(vote.candidates) ? vote.candidates[0] : vote.candidates
    };

    return res.status(200).json({
      success: true,
      data: voteData
    });

  } catch (error) {
    console.error('Get user vote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



export default router; 