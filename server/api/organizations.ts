import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';


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
    const { name, ownerName, ownerEmail, ownerPassword } = req.body;

  
    if (!name || !ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

  
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization already exists with this name'
      });
    }

 
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', ownerEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }


    const adminPasswordHash = crypto.createHash('sha256').update(ownerPassword).digest('hex');

  
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name,
        slug: slug,
        admin_email: ownerEmail,
        admin_password_hash: adminPasswordHash,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create organization'
      });
    }


    const { data: userData, error: userError } = await supabase
      .from('auth_users')
      .insert({
        email: ownerEmail,
        password_hash: adminPasswordHash,
        name: ownerName,
        role: 'admin',
        is_verified: true
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin user'
      });
    }

   
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userData.id,
        organization_id: orgData.id,
        role: 'admin',
        joined_via: 'admin_creation',
        is_active: true
      });

    if (userOrgError) {
      console.error('User-org relationship error:', userOrgError);
      return res.status(500).json({
        success: false,
        message: 'Failed to associate user with organization'
      });
    }


    const { data: sessionData, error: sessionError } = await supabase.rpc('create_user_session', {
      p_user_id: userData.id,
      p_organization_id: orgData.id,
      p_ip_address: req.ip,
      p_user_agent: req.get('User-Agent')
    });

    if (sessionError || !sessionData) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create session'
      });
    }

    res.json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization: orgData,
        user: userData,
        sessionToken: sessionData
      }
    });

  } catch (error) {
    console.error('Organization creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});



router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, ownerName, ownerPassword } = req.body;

   
    if (!email || !name || !ownerName || !ownerPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

  
    await supabase
      .from('otps')
      .delete()
      .eq('email', email);

  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

 
    const { error: otpError } = await supabase
      .from('otps')
      .insert({
        email: email,
        otp: otp,
        expires_at: expiresAt.toISOString()
      });

    if (otpError) {
      console.error('OTP storage error:', otpError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP'
      });
    }

    
          const emailResponse = await fetch(`${process.env.VITE_APP_URL || 'http://localhost:3000'}/api/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        otp: otp
      })
    });

    if (!emailResponse.ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('OTP sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

   
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('is_verified', false)
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

   
    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    await supabase
      .from('otps')
      .update({ is_verified: true })
      .eq('id', otpData.id);
  
    const { name, ownerName, ownerPassword } = req.body;
    
    if (!name || !ownerName || !ownerPassword) {
      return res.status(400).json({
        success: false,
        message: 'Organization data is required'
      });
    }
    
    const orgDetails = {
      name,
      ownerName,
      ownerEmail: email,
      ownerPassword
    };

   
    const slug = orgDetails.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  
    const adminPasswordHash = crypto.createHash('sha256').update(orgDetails.ownerPassword).digest('hex');

  
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgDetails.name,
        slug: slug,
        admin_email: orgDetails.ownerEmail,
        admin_password_hash: adminPasswordHash,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create organization'
      });
    }


    const { data: userData, error: userError } = await supabase
      .from('auth_users')
      .insert({
        email: orgDetails.ownerEmail,
        password_hash: adminPasswordHash,
        name: orgDetails.ownerName,
        role: 'admin',
        is_verified: true
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin user'
      });
    }

 
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userData.id,
        organization_id: orgData.id,
        role: 'admin',
        joined_via: 'admin_creation',
        is_active: true
      });

    if (userOrgError) {
      console.error('User-org relationship error:', userOrgError);
      return res.status(500).json({
        success: false,
        message: 'Failed to associate user with organization'
      });
    }


    const { data: sessionData, error: sessionError } = await supabase.rpc('create_user_session', {
      p_user_id: userData.id,
      p_organization_id: orgData.id,
      p_ip_address: req.ip,
      p_user_agent: req.get('User-Agent')
    });

    if (sessionError || !sessionData) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create session'
      });
    }

    res.json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization: orgData,
        user: userData,
        sessionToken: sessionData
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 