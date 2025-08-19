// Email Service using Gmail SMTP
// Configure with your Gmail credentials

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Gmail SMTP Configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: import.meta.env.VITE_GMAIL_USER || 'your-email@gmail.com',
    pass: import.meta.env.VITE_GMAIL_APP_PASSWORD || 'your-app-password'
  }
};

// Send email using Gmail SMTP
export const sendEmail = async (config: EmailConfig): Promise<boolean> => {
  try {
    // In production, you would use a proper SMTP library
    // For now, we'll simulate email sending
    console.log('📧 Email would be sent:', {
      to: config.to,
      subject: config.subject,
      html: config.html.substring(0, 100) + '...'
    });

    // Simulate email delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6B21E8;">E-Matdaan Password Reset</h2>
      <p>Hello,</p>
      <p>You requested a password reset for your E-Matdaan account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Reset Password
      </a>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this reset, please ignore this email.</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'E-Matdaan - Password Reset Request',
    html
  });
};

// Send welcome email
export const sendWelcomeEmail = async (email: string, name: string, verificationToken: string): Promise<boolean> => {
  const verifyUrl = `${window.location.origin}/verify-email?token=${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6B21E8;">Welcome to E-Matdaan!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with E-Matdaan, the secure digital voting platform.</p>
      <p>To complete your registration, please verify your email address:</p>
      <a href="${verifyUrl}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Verify Email Address
      </a>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${verifyUrl}</p>
      <p>Once verified, you'll be able to participate in elections and access all platform features.</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to E-Matdaan - Verify Your Email',
    html
  });
};

// Send election notification
export const sendElectionNotification = async (
  email: string, 
  name: string, 
  electionName: string, 
  electionId: string
): Promise<boolean> => {
  const voteUrl = `${window.location.origin}/vote/${electionId}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6B21E8;">Election Now Open!</h2>
      <p>Hello ${name},</p>
      <p>The election "<strong>${electionName}</strong>" is now open for voting.</p>
      <p>Click the button below to cast your vote:</p>
      <a href="${voteUrl}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Vote Now
      </a>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${voteUrl}</p>
      <p>Thank you for participating in the democratic process!</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Election Now Open: ${electionName}`,
    html
  });
};

// Send vote confirmation
export const sendVoteConfirmation = async (
  email: string, 
  name: string, 
  electionName: string, 
  receiptId: string
): Promise<boolean> => {
  const verifyUrl = `${window.location.origin}/verify?receipt=${receiptId}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6B21E8;">Vote Confirmed!</h2>
      <p>Hello ${name},</p>
      <p>Your vote in "<strong>${electionName}</strong>" has been successfully recorded.</p>
      <p><strong>Receipt ID:</strong> ${receiptId}</p>
      <p>You can verify your vote using the button below:</p>
      <a href="${verifyUrl}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Verify Your Vote
      </a>
      <p>If the button doesn't work, copy and paste this link:</p>
      <p style="word-break: break-all; color: #6B21E8;">${verifyUrl}</p>
      <p>Thank you for participating!</p>
      <p>Best regards,<br>E-Matdaan Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Vote Confirmed: ${electionName}`,
    html
  });
}; 