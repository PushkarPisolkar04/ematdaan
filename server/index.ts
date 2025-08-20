import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import organizationsRouter from './api/organizations.js';

// Load environment variables from the project root
dotenv.config({ path: '.env' });

const app = express();

// Security middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// Rate limiting for email endpoints
const emailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many email requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

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
app.post('/api/send-otp', emailRateLimit, async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format',
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
    // Log error securely without exposing sensitive data
    console.error('Failed to send OTP email - Error type:', error instanceof Error ? error.constructor.name : typeof error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
});

// Send invitation endpoint
app.post('/send-invitation', emailRateLimit, async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    // Validate input
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and html are required',
      });
    }

    // Validate email format
    if (!isValidEmail(to)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate subject length
    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Subject too long',
      });
    }

    // Validate HTML content length
    if (html.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Email content too long',
      });
    }

    await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: to,
      subject: subject,
      html: html,
    });

    res.json({
      success: true,
      message: 'Invitation email sent successfully',
    });
  } catch (error) {
    // Log error securely without exposing sensitive data
    console.error('Failed to send invitation email - Error type:', error instanceof Error ? error.constructor.name : typeof error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation email. Please try again.',
    });
  }
});

// Password reset endpoint
app.post('/api/send-password-reset', emailRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Generate a secure reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database (you'll need to create a reset_tokens table)
    // For now, we'll just send the email with the token
    const baseUrl = process.env.VITE_APP_URL || 
                   process.env.FRONTEND_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://ematdaan.vercel.app' : 'http://localhost:3000');
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: 'Reset Your E-Matdaan Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B21E8;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>You requested to reset your password for your E-Matdaan account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="background-color: #6B21E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>For security, this link can only be used once</li>
          </ul>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #6B21E8;">${resetLink}</p>
          <p>Best regards,<br>E-Matdaan Team</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Failed to send password reset email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email. Please try again.',
    });
  }
});

// Organizations routes
app.use('/api/organizations', organizationsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 