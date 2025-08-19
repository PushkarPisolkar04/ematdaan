import { supabase } from './supabase';
import nodemailer from 'nodemailer';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate secure reset token
const generateResetToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not for security
      return { success: true, message: 'If this email exists, you will receive a password reset link.' };
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('Failed to store reset token:', tokenError);
      throw new Error('Failed to generate reset token');
    }

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset - E-Matdaan',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${user.name || 'User'},</p>
              
              <p>We received a request to reset your password for your E-Matdaan account. If you made this request, click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${resetLink}</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>For security reasons, this link can only be used once and will expire automatically.</p>
              
              <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from E-Matdaan Security System</p>
              <p>© 2024 E-Matdaan - Secure Digital Voting Platform</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    return { 
      success: true, 
      message: 'Password reset link has been sent to your email address.' 
    };

  } catch (error) {
    console.error('Password reset email failed:', error);
    return { 
      success: false, 
      message: 'Failed to send password reset email. Please try again later.' 
    };
  }
};

// Verify reset token
export const verifyResetToken = async (token: string): Promise<{ valid: boolean; userId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired reset token' };
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      return { valid: false, error: 'Reset token has expired' };
    }

    return { valid: true, userId: data.user_id };

  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false, error: 'Failed to verify reset token' };
  }
};

// Reset password with token
export const resetPasswordWithToken = async (
  token: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Verify token first
    const tokenVerification = await verifyResetToken(token);
    
    if (!tokenVerification.valid || !tokenVerification.userId) {
      return { 
        success: false, 
        message: tokenVerification.error || 'Invalid reset token' 
      };
    }

    // Hash the new password (in production, use bcrypt)
    const encoder = new TextEncoder();
    const data = encoder.encode(newPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenVerification.userId);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      throw new Error('Failed to update password');
    }

    // Mark token as used
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (tokenError) {
      console.error('Failed to mark token as used:', tokenError);
    }

    return { 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    };

  } catch (error) {
    console.error('Password reset failed:', error);
    return { 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    };
  }
};

// Clean up expired tokens (should be run periodically)
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', now);

    if (error) {
      console.error('Failed to cleanup expired tokens:', error);
    }
  } catch (error) {
    console.error('Token cleanup failed:', error);
  }
}; 