// In a real implementation, this would use a proper email service
// For now, we'll simulate OTP operations

import { supabase } from '@/lib/supabase';
import { sendOTPEmail } from './email';

export interface OTPResponse {
  success: boolean;
  message: string;
  otp?: string;
}

const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

export const sendOTP = async (email: string): Promise<OTPResponse> => {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Invalid email address',
      };
    }

    // First try to delete any existing OTP for this email
    await supabase
      .from('otps')
      .delete()
      .eq('email', email);

    // Generate a new OTP
    const otp = generateOTP();
    
    // Store OTP in database with 5-minute expiry
    const { error: insertError } = await supabase
      .from('otps')
      .insert({
        email,
        otp: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      throw new Error('Failed to generate OTP. Please try again.');
    }

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);
    if (!emailResult.success) {
      // If email fails, delete the OTP record
      await supabase
        .from('otps')
        .delete()
        .eq('email', email);
      throw new Error(emailResult.message);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      // Only returning OTP for development
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
  } catch (error) {
    console.error('Failed to send OTP:', error);
    // Delete any stored OTP if the process failed
    await supabase
      .from('otps')
      .delete()
      .eq('email', email);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send OTP',
    };
  }
};

export const verifyOTP = async (
  email: string,
  otp: string
): Promise<OTPResponse> => {
  try {
    if (!otp || otp.length !== 6) {
      return {
        success: false,
        message: 'Invalid OTP format',
      };
    }

    // Get OTP from database
    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching OTP:', error);
      return {
        success: false,
        message: 'No OTP found for this email',
      };
    }

    // Check if OTP has expired
    if (new Date() > new Date(data.expires_at)) {
      // Delete expired OTP
      await supabase
        .from('otps')
        .delete()
        .eq('email', email);

      return {
        success: false,
        message: 'OTP has expired. Please request a new one.',
      };
    }

    if (data.otp !== otp) {
      return {
        success: false,
        message: 'Invalid OTP. Please try again.',
      };
    }

    // Delete used OTP
    await supabase
      .from('otps')
      .delete()
      .eq('email', email);

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify OTP',
    };
  }
}; 