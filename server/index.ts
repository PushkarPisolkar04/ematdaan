import express from 'express';
import cors from 'cors';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import organizationsRouter from './api/organizations';
import electionsRouter from './api/elections';
import candidatesRouter from './api/candidates';
import invitationsRouter from './api/invitations';
import authRouter from './api/auth';
import statsRouter from './api/stats';
import votesRouter from './api/votes';

dotenv.config({ path: '.env' });

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ematdaan.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

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

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Test SendGrid configuration on startup
if (process.env.SENDGRID_API_KEY) {
  console.log('SendGrid is ready to send emails');
} else {
  console.error('SendGrid API key not configured');
}

app.post('/api/send-otp', emailRateLimit, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format',
      });
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
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
    };

    await sgMail.send(msg);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Failed to send OTP email - Error type:', error instanceof Error ? error.constructor.name : typeof error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
});


app.post('/send-invitation', emailRateLimit, async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and html are required',
      });
    }

    if (!isValidEmail(to)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Subject too long',
      });
    }

    if (html.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Email content too long',
      });
    }

    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: subject,
      html: html,
    };

    await sgMail.send(msg);

    res.json({
      success: true,
      message: 'Invitation email sent successfully',
    });
  } catch (error) {
    console.error('Failed to send invitation email - Error type:', error instanceof Error ? error.constructor.name : typeof error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation email. Please try again.',
    });
  }
});

app.use('/api/organizations', organizationsRouter);

app.use('/api/elections', electionsRouter);

app.use('/api/candidates', candidatesRouter);

app.use('/api/invitations', invitationsRouter);

app.use('/api/auth', authRouter);

app.use('/api/stats', statsRouter);

app.use('/api/votes', votesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 