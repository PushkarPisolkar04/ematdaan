import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config({ path: '.env' });
const router = express.Router();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpcemfyksgaxthzzdwiv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey || 'invalid_key_will_cause_error');


const generateInvitationToken = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_invitation_token');
  if (error) throw error;
  return data;
};


router.post('/create-from-csv', async (req, res) => {
  try {
    const { emails, organizationId } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    
    const invitations: any[] = [];
    for (const email of emails) {
      if (email && isValidEmail(email)) {
        const invitationToken = await generateInvitationToken();
        
        invitations.push({
          organization_id: organizationId,
          email: email.toLowerCase(),
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
      }
    }

    if (invitations.length === 0) {
      return res.status(400).json({ error: 'No valid emails provided' });
    }

    
    const { data: invitationData, error: insertError } = await supabase
      .from('student_invitations')
      .insert(invitations)
      .select();

    if (insertError) {
      console.error('Error inserting invitations:', insertError);
      return res.status(500).json({ error: 'Failed to create invitations' });
    }

    
    await sendInvitationEmails(invitationData);

    res.json({ 
      success: true, 
      count: invitationData.length,
      invitations: invitationData 
    });

  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { data: invitations, error } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    res.json({ invitations: invitations || [] });

  } catch (error) {
    console.error('Error getting invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate invitation token
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    
    const { data, error } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (error || !data) {
      return res.json({
        invitation_id: '',
        email: '',
        organization_id: '',
        is_valid: false,
        reason: 'Invalid invitation link'
      });
    }

    
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const isExpired = expiresAt < now;
    const isUsed = data.is_used;

    let is_valid = false;
    let reason = '';

    if (isUsed) {
      reason = 'Invitation has already been used';
    } else if (isExpired) {
      reason = 'Invitation has expired';
    } else {
      is_valid = true;
      reason = 'Valid invitation';
    }

    res.json({
      invitation_id: data.id,
      email: data.email,
      organization_id: data.organization_id,
      is_valid: is_valid,
      reason: reason
    });

  } catch (error) {
    console.error('Error validating invitation token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to check table structure
router.get('/test', async (req, res) => {
  try {
    
    const { data, error } = await supabase
      .from('student_invitations')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Table check error:', error);
      return res.json({ 
        tableExists: false, 
        error: error.message,
        tableName: 'student_invitations'
      });
    }

    res.json({ 
      tableExists: true, 
      count: data?.length || 0,
      sampleData: data?.slice(0, 2) || []
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation statistics
router.get('/stats/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { data, error } = await supabase.rpc('get_invitation_stats', {
      p_organization_id: organizationId
    });

    if (error) {
      console.error('Error getting invitation stats:', error);
      return res.status(500).json({ error: 'Failed to get invitation stats' });
    }

    res.json(data[0] || {
      total_invitations: 0,
      used_invitations: 0,
      pending_invitations: 0,
      expired_invitations: 0
    });

  } catch (error) {
    console.error('Error getting invitation stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const sendInvitationEmails = async (invitations: any[]) => {
  for (const invitation of invitations) {
    const invitationLink = generateInvitationLink(invitation.invitation_token);
    
    
    await sendInvitationEmail(invitation.email, invitationLink);
  }
};


const generateInvitationLink = (token: string): string => {
  const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/auth?invitation=${token}`;
};


const sendInvitationEmail = async (email: string, invitationLink: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6B21E8;">You're Invited to Vote!</h2>
      <p>Hello,</p>
      <p>You have been invited to participate in the election.</p>
      <p>Click the button below to register and vote:</p>
      <a href="${invitationLink}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Register and Vote
      </a>
      <p><strong>Important:</strong></p>
      <ul>
        <li>This invitation link can only be used once</li>
        <li>The link will work until you complete registration</li>
        <li>If you close the page without registering, you can use the link again</li>
        <li>Link expires in 7 days</li>
      </ul>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${invitationLink}</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  // Send invitation email using SendGrid directly
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: 'You are invited to vote in the election',
      html
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return { success: true, warning: 'Invitation created but email could not be sent' };
  }
};


const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


router.delete('/delete/:invitationId', async (req, res) => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }


    const { data, error } = await supabase
      .from('student_invitations')
      .delete()
      .eq('id', invitationId)
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to delete invitation' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ 
      success: true, 
      message: 'Invitation deleted successfully',
      deletedInvitation: data[0]
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/test-delete', (req, res) => {
  res.json({ message: 'Delete route is working' });
});

export default router; 