import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import organizationsRouter from './api/organizations';
import electionsRouter from './api/elections';
import candidatesRouter from './api/candidates';
import invitationsRouter from './api/invitations';
import authRouter from './api/auth';
import statsRouter from './api/stats';
import votesRouter from './api/votes';

// Load environment variables from the project root
dotenv.config({ path: '.env' });

const app = express();

// Security middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ematdaan.vercel.app'] // Your Vercel domain
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

// Organizations routes
app.use('/api/organizations', organizationsRouter);

// Elections routes
app.use('/api/elections', electionsRouter);

// Candidates routes
app.use('/api/candidates', candidatesRouter);

// Invitations routes
app.use('/api/invitations', invitationsRouter);

// Auth routes
app.use('/api/auth', authRouter);

// Stats routes
app.use('/api/stats', statsRouter);

// Votes routes
app.use('/api/votes', votesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 