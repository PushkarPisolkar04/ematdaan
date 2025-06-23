import { supabase } from '@/lib/supabase';
import { generateDID } from '@/lib/did';
import { sendOTP, verifyOTP } from '@/lib/otp';
import type { User } from '@/types';

export const registerUser = async (
  address: string,
  email: string,
  name: string,
  dob: string
) => {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select()
      .or(`email.eq.${email},address.eq.${address.toLowerCase()}`);

    if (existingUser && existingUser.length > 0) {
      throw new Error('User already exists with this email or wallet address');
    }

    // Generate DID
    const did = await generateDID(address);

    // Store registration data in session storage
    sessionStorage.setItem('registration', JSON.stringify({
        address: address.toLowerCase(),
        email,
        name,
        dob,
      did
    }));

    // Send OTP
    const otpResponse = await sendOTP(email);
    return { otpSent: otpResponse.success };
  } catch (error) {
    throw error;
  }
};

export const verifyRegistration = async (email: string, otp: string) => {
  try {
    // Verify OTP
    const otpResponse = await verifyOTP(email, otp);
    if (!otpResponse.success) {
      throw new Error(otpResponse.message);
    }

    // Get registration data
    const registration = sessionStorage.getItem('registration');
    if (!registration) {
      throw new Error('Registration data not found');
    }

    const { address, name, dob, did } = JSON.parse(registration);

    // Create user in database
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        address,
        email,
        name,
        dob,
        did
      })
      .select()
      .single();

    if (error) throw error;

    // Clear registration data
    sessionStorage.removeItem('registration');

    // Store auth data
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userDID', did);
    localStorage.setItem('wallet_address', address);

    return user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string) => {
  try {
    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) {
      throw new Error('User not found');
    }

    // Store email for verification
    sessionStorage.setItem('login_email', email);

    // Send OTP
    const otpResponse = await sendOTP(email);
    return { otpSent: otpResponse.success };
  } catch (error) {
    throw error;
  }
};

export const verifyLogin = async (email: string, otp: string) => {
  try {
    // Verify OTP
    const otpResponse = await verifyOTP(email, otp);
    if (!otpResponse.success) {
      throw new Error(otpResponse.message);
    }

    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('User not found. Please register first.');
      }
      throw error;
    }

    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    // Store auth data
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userDID', user.did);
    localStorage.setItem('wallet_address', user.address);

    return user;
  } catch (error) {
    throw error;
  }
};

export const checkAdminAccess = async (address: string) => {
  try {
    const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
    if (!adminAddress) {
      throw new Error('Admin address not configured');
    }

    return address.toLowerCase() === adminAddress.toLowerCase();
  } catch (error) {
    throw error;
  }
}; 