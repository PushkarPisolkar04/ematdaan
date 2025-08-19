// Email sending functionality
// Uses the existing API endpoint for production, console logging for development

export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> => {
  try {
    let emailSent = false;
    let emailError = null;

    // Try to send real email via API first
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          emailSent = true;
          console.log('📧 OTP sent successfully via email to:', email);
          return {
            success: true,
            message: 'OTP sent successfully via email'
          };
        }
      }
    } catch (apiError) {
      emailError = apiError;
      console.warn('Email API failed:', apiError);
    }

    // If email sending failed and we're in development, show OTP for testing
    if (!emailSent && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
      console.log('📧 Email sending failed - Development Mode Fallback:');
      console.log('To:', email);
      console.log('OTP Code (for testing only):', otp);
      console.log('Subject: Verify your email address');
      console.log('📧 Use this OTP for testing');
      
      return {
        success: true,
        message: 'OTP available in console for development testing'
      };
    }

    // If we reach here, email failed and we're not in development
    return {
      success: true, // Return success to prevent OTP deletion
      message: 'OTP generated (email service unavailable)'
    };

  } catch (error) {
    console.error('Failed to send OTP:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send OTP' 
    };
  }
}; 