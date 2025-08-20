import { supabase } from './supabase';

export interface StudentInvitation {
  id: string;
  organization_id: string;
  email: string;
  invitation_token: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationValidation {
  invitation_id: string;
  email: string;
  organization_id: string;
  is_valid: boolean;
  reason: string;
}

// Generate unique invitation token
export const generateInvitationToken = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_invitation_token');
  if (error) throw error;
  return data;
};

// Upload CSV and create invitations
export const uploadStudentCSV = async (file: File, organizationId: string): Promise<{ success: boolean; count: number }> => {
  try {
    // Parse CSV file
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find email column
    const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
    if (emailIndex === -1) {
      throw new Error('No email column found in CSV');
    }
    
    // Process each line
    const invitations = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const email = values[emailIndex];
      
      if (email && isValidEmail(email)) {
        const invitationToken = await generateInvitationToken();
        
        invitations.push({
          organization_id: organizationId,
          email: email.toLowerCase(),
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });
      }
    }
    
    // Insert invitations
    const { error: insertError } = await supabase
      .from('student_invitations')
      .insert(invitations);
    
    if (insertError) throw insertError;
    
    // Send invitation emails
    await sendInvitationEmails(invitations);
    
    return { success: true, count: invitations.length };
  } catch (error) {
    console.error('Error uploading CSV:', error);
    throw error;
  }
};

// Send invitation emails
const sendInvitationEmails = async (invitations: any[]) => {
  for (const invitation of invitations) {
    const invitationLink = generateInvitationLink(invitation.invitation_token);
    
    // Send email using your existing email service
    await sendInvitationEmail(invitation.email, invitationLink);
  }
};

// Generate invitation link
export const generateInvitationLink = (token: string): string => {
  // Use environment variable for production URL, fallback to current origin for development
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  // Properly encode the token to handle + characters
  const encodedToken = encodeURIComponent(token);
  return `${baseUrl}/auth?invitation=${encodedToken}`;
};

// Send invitation email
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
        <li>Link expires in 30 days</li>
      </ul>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${invitationLink}</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  // Send email using the server endpoint
  try {
    const response = await fetch('http://localhost:5000/send-invitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'You are invited to vote in the election',
        html
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    // Log error securely without exposing sensitive data
    console.error('Failed to send invitation email - Network or server error');
    // Don't fail the invitation creation if email fails
    return { success: true, warning: 'Invitation created but email could not be sent' };
  }
};

// Validate invitation token
export const validateInvitationToken = async (token: string): Promise<InvitationValidation> => {
  try {
    const { data, error } = await supabase.rpc('validate_invitation_token', {
      p_token: token
    });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        invitation_id: '',
        email: '',
        organization_id: '',
        is_valid: false,
        reason: 'Invalid invitation link'
      };
    }
    
    const invitation = data[0];
    return {
      invitation_id: invitation.invitation_id,
      email: invitation.email,
      organization_id: invitation.organization_id,
      is_valid: invitation.is_valid,
      reason: invitation.reason
    };
  } catch (error) {
    console.error('Error validating invitation:', error);
    return {
      invitation_id: '',
      email: '',
      organization_id: '',
      is_valid: false,
      reason: 'Error validating invitation'
    };
  }
};

// Register user with invitation
export const registerWithInvitation = async (
  invitationToken: string,
  userData: { email: string; password: string; name: string }
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    // Validate invitation token
    const validation = await validateInvitationToken(invitationToken);
    
    if (!validation.is_valid) {
      return { success: false, error: validation.reason };
    }
    
    // Check if email matches invitation
    if (validation.email.toLowerCase() !== userData.email.toLowerCase()) {
      return { success: false, error: 'Email address does not match invitation' };
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', userData.email.toLowerCase())
      .single();
    
    if (existingUser) {
      return { success: false, error: 'User already exists with this email' };
    }
    
    // Hash password using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(userData.password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create user account
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        name: userData.name,
        role: 'student',
        is_verified: true // Auto-verified since they have invitation
      })
      .select()
      .single();
    
    if (userError) throw userError;
    
    // Create user-organization relationship
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: validation.organization_id,
        role: 'student',
        joined_via: 'invitation',
        is_active: true
      });
    
    if (userOrgError) throw userOrgError;
    
    // Mark invitation as used
    const { error: markError } = await supabase.rpc('mark_invitation_used', {
      p_invitation_id: validation.invitation_id,
      p_user_id: user.id
    });
    
    if (markError) throw markError;
    
    // Log invitation usage
    await logInvitationActivity(validation.invitation_id, 'registration_completed', {
      user_id: user.id,
      email: userData.email
    });
    
    return { success: true, user };
  } catch (error) {
    console.error('Error registering with invitation:', error);
    return { success: false, error: 'Registration failed' };
  }
};

// Get invitation statistics
export const getInvitationStats = async (organizationId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_invitation_stats', {
      p_organization_id: organizationId
    });
    
    if (error) throw error;
    
    return data[0] || {
      total_invitations: 0,
      used_invitations: 0,
      pending_invitations: 0,
      expired_invitations: 0
    };
  } catch (error) {
    console.error('Error getting invitation stats:', error);
    return {
      total_invitations: 0,
      used_invitations: 0,
      pending_invitations: 0,
      expired_invitations: 0
    };
  }
};

// Get all invitations for organization
export const getOrganizationInvitations = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting organization invitations:', error);
    return [];
  }
};

// Log invitation activity
const logInvitationActivity = async (invitationId: string, action: string, details?: any) => {
  try {
    await supabase
      .from('invitation_audit_logs')
      .insert({
        invitation_id: invitationId,
        action,
        details
      });
  } catch (error) {
    console.error('Error logging invitation activity:', error);
  }
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}; 