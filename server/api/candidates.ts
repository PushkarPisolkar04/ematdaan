import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from the project root
dotenv.config({ path: '.env' });

const router = express.Router();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpcemfyksgaxthzzdwiv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Please set it in your environment variables.');
  console.error('You can get it from your Supabase Dashboard > Settings > API > service_role key');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey || 'invalid_key_will_cause_error');

// Create candidate endpoint
router.post('/create', async (req, res) => {
  try {
    const { name, party, symbol, electionId } = req.body;

    // Validate input
    if (!name || !party || !symbol || !electionId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, party, symbol, electionId'
      });
    }

    // Validate election exists
    const { data: existingElection, error: electionCheckError } = await supabase
      .from('elections')
      .select('id')
      .eq('id', electionId)
      .single();

    if (electionCheckError || !existingElection) {
      return res.status(400).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Create candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        name: name,
        party: party,
        symbol: symbol,
        election_id: electionId
      })
      .select()
      .single();

    if (candidateError) {
      console.error('Candidate creation error:', candidateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create candidate',
        error: candidateError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      data: candidateData
    });

  } catch (error) {
    console.error('Candidate creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get candidates for election endpoint
router.get('/election/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required'
      });
    }

    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('election_id', electionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get candidates error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get candidates',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: candidates
    });

  } catch (error) {
    console.error('Get candidates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update candidate endpoint
router.put('/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { name, party, symbol } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate ID is required'
      });
    }

    if (!name || !party || !symbol) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, party, symbol'
      });
    }

    const { data: candidateData, error } = await supabase
      .from('candidates')
      .update({
        name: name,
        party: party,
        symbol: symbol
      })
      .eq('id', candidateId)
      .select()
      .single();

    if (error) {
      console.error('Update candidate error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update candidate',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidateData
    });

  } catch (error) {
    console.error('Update candidate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete candidate endpoint
router.delete('/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate ID is required'
      });
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (error) {
      console.error('Delete candidate error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete candidate',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully'
    });

  } catch (error) {
    console.error('Delete candidate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 