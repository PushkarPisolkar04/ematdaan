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

// Test function to check OTP table access
export const testOTPTable = async (email: string) => {
  try {
    console.log('Testing OTP table access...');
    
    // Try a simple insert
    const testOtp = '123456';
    const { data: testData, error: testError } = await supabase
      .from('otps')
      .insert({
        email: email,
        otp: testOtp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .select('id, email');

    console.log('Test insert result:', { testData, testError });

    if (testError) {
      console.error('Test insert failed:', testError);
      return false;
    }

    // Clean up test data
    await supabase
      .from('otps')
      .delete()
      .eq('email', email)
      .eq('otp', testOtp);

    console.log('OTP table access test successful');
    return true;
  } catch (error) {
    console.error('OTP table test failed:', error);
    return false;
  }
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

    // Test OTP table access first
    const tableAccess = await testOTPTable(email);
    if (!tableAccess) {
      console.error('OTP table access test failed');
      throw new Error('Cannot access OTP table. Please check database permissions.');
    }

    // First try to delete any existing OTP for this email
    await supabase
      .from('otps')
      .delete()
      .eq('email', email);

    // Generate a new OTP
    const otp = generateOTP();
    
    // Store OTP in database with 5-minute expiry
    console.log('Storing OTP in database for email:', email);
    const { data: insertData, error: insertError } = await supabase
      .from('otps')
      .insert({
        email,
        otp: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .select('id, email, expires_at');

    console.log('OTP insert result:', { 
      success: !insertError, 
      dataCount: insertData?.length || 0,
      error: insertError 
    });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      throw new Error('Failed to generate OTP. Please try again.');
    }

    // Handle Supabase null response issue - if no error occurred, assume success
    if (!insertData || insertData.length === 0) {
      console.log('OTP insert succeeded but no data returned (common Supabase issue)');
      
      // Wait a moment for the insert to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify by querying the database to confirm OTP was stored
      const { data: verifyData, error: verifyError } = await supabase
        .from('otps')
        .select('id, email, otp')
        .eq('email', email)
        .eq('otp', otp)
        .maybeSingle();
      
      console.log('OTP verification query result:', { verifyData, verifyError });
      
      if (verifyError) {
        console.error('OTP verification query error:', verifyError);
        throw new Error('Failed to verify OTP storage. Please try again.');
      }
      
      if (!verifyData) {
        console.error('OTP verification failed - OTP not found in database');
        
        // Try a simpler query to see if any OTP exists for this email
        const { data: anyOtp, error: anyError } = await supabase
          .from('otps')
          .select('id, email, created_at')
          .eq('email', email)
          .maybeSingle();
        
        console.log('Any OTP for email query:', { anyOtp, anyError });
        
        throw new Error('Failed to store OTP. Please try again.');
      }
      
      console.log('OTP storage verified successfully');
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
    console.log('Fetching OTP for email:', email);
    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    console.log('OTP fetch result:', { 
      found: !!data, 
      error: error,
      data: data ? { id: data.id, email: data.email, expires_at: data.expires_at } : null
    });

    if (error) {
      console.error('Error fetching OTP:', error);
      return {
        success: false,
        message: 'Error fetching OTP from database',
      };
    }

    if (!data) {
      console.error('No OTP found for email:', email);
      
      // Let's check what OTPs exist in the database
      const { data: allOtps, error: listError } = await supabase
        .from('otps')
        .select('email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('Recent OTPs in database:', allOtps);
      
      return {
        success: false,
        message: 'No OTP found for this email. Please request a new one.',
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