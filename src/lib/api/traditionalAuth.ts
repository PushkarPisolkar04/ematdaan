import { supabase } from '@/lib/supabase';
import { sendOTP, verifyOTP } from '@/lib/otp';
import { sendAccessCodesEmail } from '@/lib/email';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  voter_access_code: string | null;
  admin_access_code: string | null;
  code_access_enabled: boolean;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  joined_via: string;
  is_active: boolean;
}

export interface AccessToken {
  id: string;
  token: string;
  organization_id: string;
  role: string;
  election_id?: string;
  expires_at: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

// Organization creation
export const createOrganization = async (data: {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}) => {
  try {
    // Organization creation started
    
    // Generate slug from organization name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check if organization already exists
    const { data: existingOrgBySlug, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();

    // Also check by name (case insensitive)
    const { data: existingOrgByName, error: nameCheckError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .ilike('name', data.name)
      .maybeSingle();

    if (orgCheckError) {
      console.error('Error checking organization existence by slug:', orgCheckError);
    }

    if (nameCheckError) {
      console.error('Error checking organization existence by name:', nameCheckError);
    }

    const existingOrg = existingOrgBySlug || existingOrgByName;

    if (existingOrg) {
      console.log('Organization already exists:', existingOrg);
      // Suggest alternative names
      const suggestions = [
        `${data.name} Voting`,
        `${data.name} Elections`,
        `${data.name} Democracy`,
        `${data.name} Polls`,
        `${data.name} Votes`,
        `${data.name} 2024`,
        `${data.name} Digital`
      ];
      throw new Error(`Organization "${existingOrg.name}" already exists with this name. Please choose a different name. Suggestions: ${suggestions.join(', ')}`);
    }

    // Check if owner email already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('auth_users')
      .select('email')
      .eq('email', data.ownerEmail)
      .maybeSingle();

    if (userCheckError) {
      console.error('Error checking user existence:', userCheckError);
      // Continue anyway, let the insert handle the error
    }

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Generate secure access codes
    const generateSecureCode = (prefix: string, role: string) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const timestamp = Date.now().toString(36).toUpperCase();
      let randomPart = '';
      
      // Generate 12 character random part for better security
      for (let i = 0; i < 12; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      return `${prefix.toUpperCase()}-${timestamp}-${randomPart}-${role.toUpperCase()}`;
    };

    // Retry mechanism for organization creation
    let org = null;
    let orgError = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !org) {
      attempts++;
      
      // Small delay to avoid race conditions (only on retries)
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const voterCode = generateSecureCode(slug, 'VOTER');
      const adminCode = generateSecureCode(slug, 'ADMIN');

      // Create organization
      
      const result = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug,
          domain: `${slug}.ematdaan.com`,
          description: `Voting platform for ${data.name}`,
          code_access_enabled: true,
          voter_access_code: voterCode,
          admin_access_code: adminCode,
          is_active: true
        })
        .select()
        .single();

      org = result.data;
      orgError = result.error;

      // Handle case where insert succeeds but data is null (common Supabase issue)
      if (!org && !orgError) {
        // Check if the organization was actually created
        const { data: checkOrg, error: checkError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        
        if (checkOrg) {
          org = checkOrg; // Use the found organization
          break; // Exit the retry loop
        } else {
          // Continue to retry
          continue;
        }
      }

      if (orgError) {
        console.error('Error creating organization:', orgError);
        console.error('Error details:', {
          code: orgError.code,
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint
        });
        
        if (orgError.code === '23505') {
          // Check if it's a unique constraint violation on access codes
          if (orgError.message.includes('voter_access_code') || orgError.message.includes('admin_access_code')) {
            console.log('Access code collision detected, will retry...');
            if (attempts < maxAttempts) {
              continue; // Try again with new codes
            } else {
              throw new Error('Unable to generate unique access codes. Please try again.');
            }
          }
          // Check if it's a slug constraint violation
          if (orgError.message.includes('slug')) {
            console.log('Slug constraint violation detected. Checking if organization was created...');
            
            // Check if the organization was actually created despite the error
            const { data: checkOrg } = await supabase
              .from('organizations')
              .select('id, name')
              .eq('slug', slug)
              .maybeSingle();
            
            if (checkOrg) {
              console.log('Organization was created successfully despite error:', checkOrg);
              org = checkOrg; // Use the found organization
              orgError = null; // Clear the error
              break; // Exit the retry loop
            } else {
              throw new Error('Organization name already exists. Please choose a different name.');
            }
          }
          throw new Error('Organization name already exists. Please choose a different name.');
        }
        
        // For other errors, don't retry
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }
    }

    if (!org) {
      console.error('Organization creation returned null data but no error');
      throw new Error('Failed to create organization. Please try again.');
    }
    
    // Hash password
    const passwordHash = await hashPassword(data.ownerPassword);

    // Create owner user
    
    let user = null;
    let userError = null;
    
    const userResult = await supabase
      .from('auth_users')
      .insert({
        email: data.ownerEmail,
        password_hash: passwordHash,
        name: data.ownerName,
        role: 'org_owner',
        is_verified: false,
        verification_token: generateToken()
      })
      .select()
      .single();

    user = userResult.data;
    userError = userResult.error;

    // Handle case where user insert succeeds but data is null (same Supabase issue)
    if (!user && !userError) {
      // Check if the user was actually created
      const { data: checkUser, error: checkError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', data.ownerEmail)
        .maybeSingle();
      
      if (checkUser) {
        user = checkUser; // Use the found user
      } else {
        console.error('User was not created despite successful insert response');
        throw new Error('Failed to create user account. Please try again.');
      }
    }

    if (userError) {
      console.error('Error creating user account');
      throw new Error('Failed to create user account. Please try again.');
    }

    if (!user) {
      console.error('User creation returned null data but no error');
      throw new Error('Failed to create user account. Please try again.');
    }
    
    // Link user to organization
    
    const { data: linkData, error: linkError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'org_owner',
        joined_via: 'organization_creation',
        is_active: true
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error linking user to organization:', linkError);
      throw new Error('Failed to link user to organization. Please try again.');
    }

    // Send verification email
    let otpSent = false;
    try {
      await sendOTP(data.ownerEmail);
      otpSent = true;
    } catch (otpError) {
      console.error('Error sending OTP:', otpError);
      // Don't throw error - allow organization creation to succeed even if OTP fails
    }

    // Create invitation link for admin
    let invitationLink = '';
    try {
      const invitationToken = await createInvitationToken({
        organizationId: org.id,
        role: 'admin',
        expiresInDays: 30,
        usageLimit: 10,
        createdBy: user.id
      });
      
      if (invitationToken && invitationToken.token) {
        const baseUrl = import.meta.env.VITE_APP_URL || 
                       (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');
        invitationLink = `${baseUrl}/login?token=${invitationToken.token}`;
      }
    } catch (invitationError) {
      console.error('Error creating invitation link:', invitationError);
      // Don't throw error - allow organization creation to succeed even if invitation fails
    }

    // Send access codes email to admin
    try {
      await sendAccessCodesEmail(
        data.ownerEmail,
        data.name,
        {
          voterCode: org.voter_access_code,
          adminCode: org.admin_access_code,
          invitationLink: invitationLink
        }
      );
    } catch (accessCodesError) {
      console.error('Error sending access codes email:', accessCodesError);
      // Don't throw error - allow organization creation to succeed even if email fails
    }

    // Organization creation completed successfully
    return { 
      user, 
      organization: org, 
      otpSent,
      accessCodes: {
        voterCode: org.voter_access_code,
        adminCode: org.admin_access_code,
        invitationLink: invitationLink
      }
    };
  } catch (error) {
    console.error('Organization creation failed with error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
};

// Validate access code
export const validateAccessCode = async (code: string) => {
  try {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .or(`voter_access_code.eq.${code},admin_access_code.eq.${code}`)
      .eq('is_active', true)
      .eq('code_access_enabled', true)
      .maybeSingle();

    if (error) {
      console.error('Error validating access code:', error);
      throw new Error('Error validating access code');
    }

    if (!org) {
      throw new Error('Invalid or expired access code');
    }

    const role = org.voter_access_code === code ? 'voter' : 'admin';

    return { organization: org, role };
  } catch (error) {
    throw error;
  }
};

// Validate invitation token
export const validateInvitationToken = async (token: string) => {
  try {
    const { data, error } = await supabase.rpc('validate_access_token', { p_token: token });

    if (error || !data || data.length === 0) {
      throw new Error('Invalid or expired invitation link');
    }

    const tokenData = data[0];
    if (!tokenData.is_valid) {
      throw new Error('Invitation link has expired or reached usage limit');
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', tokenData.organization_id)
      .single();

    if (orgError) throw orgError;

    return {
      tokenId: tokenData.token_id,
      organization: org,
      role: tokenData.role,
      electionId: tokenData.election_id
    };
  } catch (error) {
    throw error;
  }
};

// User registration
export const registerUser = async (data: {
  email: string;
  password: string;
  name: string;
  organizationId: string;
  role: string;
  tokenId?: string;
  joinedVia: string;
}) => {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('email')
      .eq('email', data.email)
      .single();

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .insert({
        email: data.email,
        password_hash: passwordHash,
        name: data.name,
        role: data.role,
        is_verified: false,
        verification_token: generateToken()
      })
      .select()
      .single();

    if (userError) throw userError;

    // Link user to organization
    await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: data.organizationId,
        role: data.role,
        joined_via: data.joinedVia,
        access_token_id: data.tokenId
      });

    // Update token usage if provided
    if (data.tokenId) {
      // Get current usage count and increment
      const { data: token } = await supabase
        .from('access_tokens')
        .select('used_count')
        .eq('id', data.tokenId)
        .single();
      
      if (token) {
        await supabase
          .from('access_tokens')
          .update({ used_count: token.used_count + 1 })
          .eq('id', data.tokenId);
      }
    }

    // Send verification email
    await sendOTP(data.email);

    return { user, otpSent: true };
  } catch (error) {
    throw error;
  }
};

// User login
export const loginUser = async (credentials: {
  email: string;
  password: string;
  organizationId: string;
}) => {
  try {
    // Get user
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', credentials.email)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.is_locked) {
      throw new Error('Account is locked. Please contact administrator.');
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.password_hash);
    if (!isValidPassword) {
      // Increment login attempts
      await supabase
        .from('auth_users')
        .update({ 
          login_attempts: user.login_attempts + 1,
          is_locked: user.login_attempts >= 4
        })
        .eq('id', user.id);

      throw new Error('Invalid credentials');
    }

    // Check if email is verified
    if (!user.is_verified) {
      throw new Error('Please verify your email before logging in');
    }

    // Check if user belongs to the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', credentials.organizationId)
      .eq('is_active', true)
      .single();

    if (userOrgError || !userOrg) {
      throw new Error('You do not have access to this organization');
    }

    // Create session
    const sessionToken = await createSession(user.id, credentials.organizationId);

    return { user, userOrganization: userOrg, sessionToken };
  } catch (error) {
    throw error;
  }
};

// Verify email with OTP
export const verifyUserEmail = async (email: string, otp: string) => {
  try {
    // Verify OTP
    const otpResponse = await verifyOTP(email, otp);
    if (!otpResponse.success) {
      throw new Error(otpResponse.message);
    }

    // Update user as verified
    const { data: user, error } = await supabase
      .from('auth_users')
      .update({ 
        is_verified: true,
        verification_token: null
      })
      .eq('email', email)
      .select()
      .single();

    if (error) throw error;

    return user;
  } catch (error) {
    throw error;
  }
};

// Create invitation token
export const createInvitationToken = async (data: {
  organizationId: string;
  role: string;
  electionId?: string;
  expiresInDays?: number;
  usageLimit?: number;
  createdBy: string;
}) => {
  try {
    const { data: token, error } = await supabase.rpc('generate_invitation_token');
    if (error) throw error;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const { data: accessToken, error: tokenError } = await supabase
      .from('access_tokens')
      .insert({
        token,
        organization_id: data.organizationId,
        role: data.role,
        election_id: data.electionId,
        expires_at: expiresAt.toISOString(),
        usage_limit: data.usageLimit || 1,
        created_by: data.createdBy
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    return accessToken;
  } catch (error) {
    throw error;
  }
};

// Get user organizations
export const getUserOrganizations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    return data;
  } catch (error) {
    throw error;
  }
};

// Validate session
export const validateSession = async (sessionToken: string) => {
  try {
    const { data, error } = await supabase.rpc('validate_session', { p_session_token: sessionToken });

    if (error) throw error;

    return data[0] || null;
  } catch (error) {
    throw error;
  }
};

// Create session
export const createSession = async (userId: string, organizationId: string): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('create_user_session', {
      p_user_id: userId,
      p_organization_id: organizationId
    });

    if (error) throw error;

    return data;
  } catch (error) {
    throw error;
  }
};

// Helper functions
const hashPassword = async (password: string): Promise<string> => {
  // In production, use bcrypt or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}; 