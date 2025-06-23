// Remove all nodemailer and Node.js code. Use a fetch call to a serverless endpoint instead.

export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to send OTP');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send OTP' 
    };
  }
}; 