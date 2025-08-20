import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const router = express.Router();
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpcemfyksgaxthzzdwiv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey || 'invalid_key_will_cause_error');

// Register user with invitation
router.post('/register-with-invitation', async (req, res) => {
  try {
    const { token, name, email, password } = req.body;

    if (!token || !name || !email || !password) {
      return res.status(400).json({ error: 'Token, name, email, and password are required' });
    }

    // Validate invitation token
    const { data: invitationData, error: invitationError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (invitationError || !invitationData) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Check if invitation is valid
    const now = new Date();
    const expiresAt = new Date(invitationData.expires_at);
    const isExpired = expiresAt < now;
    const isUsed = invitationData.is_used;

    if (isUsed) {
      return res.status(400).json({ error: 'Invitation has already been used' });
    }

    if (isExpired) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if email matches invitation
    if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Email address does not match invitation' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create user account
    const { data: userData, error: userError } = await supabase
      .from('auth_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name,
        role: 'student',
        is_verified: true // Auto-verified since they have invitation
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Create user-organization relationship
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userData.id,
        organization_id: invitationData.organization_id,
        role: 'student',
        joined_via: 'invitation',
        is_active: true
      });

    if (userOrgError) {
      console.error('Error creating user-organization relationship:', userOrgError);
      return res.status(500).json({ error: 'Failed to associate user with organization' });
    }

    // Mark invitation as used
    const { error: markError } = await supabase
      .from('student_invitations')
      .update({ 
        is_used: true,
        used_by: userData.id,
        used_at: new Date().toISOString()
      })
      .eq('id', invitationData.id);

    if (markError) {
      console.error('Error marking invitation as used:', markError);
      // Don't fail the registration if marking as used fails
    }

    res.json({ 
      success: true, 
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        is_verified: userData.is_verified
      }
    });

  } catch (error) {
    console.error('Error registering user with invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 