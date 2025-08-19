import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.VITE_SMTP_HOST,
  port: parseInt(process.env.VITE_SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.VITE_SMTP_USER,
    pass: process.env.VITE_SMTP_PASS,
  },
});

// Test email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: 'Your E-Matdaan OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">E-Matdaan Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold;">
            ${otp}
          </div>
          <p style="color: #6b7280; margin-top: 20px;">This code will expire in 5 minutes.</p>
          <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send OTP',
    });
  }
});

// Send MFA code endpoint
app.post('/api/send-mfa', async (req, res) => {
  try {
    const { email, code, action } = req.body;

    if (!email || !code || !action) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, and action are required',
      });
    }

    await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `E-Matdaan Security Code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6B21E8, #9333EA); color: white; padding: 20px; text-align: center;">
            <h1>🔒 E-Matdaan Security</h1>
            <p>Multi-Factor Authentication</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>Your Security Code</h2>
            <p>You requested to perform: <strong>${action}</strong></p>
            <p>Enter this 6-digit code to proceed:</p>
            <div style="font-size: 32px; font-weight: bold; color: #6B21E8; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 4px;">
              ${code}
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This code expires in 5 minutes</li>
                <li>Never share this code with anyone</li>
                <li>E-Matdaan will never ask for this code via phone or email</li>
              </ul>
            </div>
            <p>If you didn't request this code, please ignore this email and contact support immediately.</p>
          </div>
          <div style="padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>&copy; 2024 E-Matdaan - Secure Digital Voting Platform</p>
            <p>This is an automated security email. Please do not reply.</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: 'MFA code sent successfully' });
  } catch (error) {
    console.error('Failed to send MFA email:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send MFA code',
    });
  }
});

const PORT = process.env.PROXY_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 