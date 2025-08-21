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


router.post('/create', async (req, res) => {
  try {
    const { name, startTime, endTime, organizationId } = req.body;

    if (!name || !startTime || !endTime || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, startTime, endTime, organizationId'
      });
    }

    const { data: existingOrg, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgCheckError || !existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const { data: electionData, error: electionError } = await supabase
      .from('elections')
      .insert({
        name: name,
        start_time: startTime,
        end_time: endTime,
        organization_id: organizationId,
        is_active: true
      })
      .select()
      .single();

    if (electionError) {
      console.error('Election creation error:', electionError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create election',
        error: electionError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: electionData
    });

  } catch (error) {
    console.error('Election creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const { data: elections, error } = await supabase
      .from('elections')
      .select(`
        *,
        candidates (
          id,
          name,
          party,
          symbol
        )
      `)
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Get elections error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get elections',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: elections
    });

  } catch (error) {
    console.error('Get elections error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/active/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const now = new Date().toISOString();
    const { data: elections, error } = await supabase
      .from('elections')
      .select(`
        id,
        name,
        start_time,
        end_time,
        is_active,
        candidates (
          id,
          name,
          party,
          symbol
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .gte('end_time', now)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get active elections error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get active elections',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: elections
    });

  } catch (error) {
    console.error('Get active elections error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


router.put('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const { name, startTime, endTime, isActive } = req.body;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required'
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: electionData, error } = await supabase
      .from('elections')
      .update(updateData)
      .eq('id', electionId)
      .select()
      .single();

    if (error) {
      console.error('Update election error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update election',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Election updated successfully',
      data: electionData
    });

  } catch (error) {
    console.error('Update election error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


router.delete('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required'
      });
    }

    const { error } = await supabase
      .from('elections')
      .delete()
      .eq('id', electionId);

    if (error) {
      console.error('Delete election error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete election',
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Election deleted successfully'
    });

  } catch (error) {
    console.error('Delete election error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required'
      });
    }

    const { data: election, error } = await supabase
      .from('elections')
      .select(`
        *,
        candidates (
          id,
          name,
          party,
          symbol
        )
      `)
      .eq('id', electionId)
      .single();

    if (error || !election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: election
    });

  } catch (error) {
    console.error('Get election error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 