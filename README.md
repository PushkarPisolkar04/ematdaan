<div align="center">
  <img src="public/logo.png" alt="E-Matdaan Logo" width="auto" height="100" />
  <h1>E-Matdaan</h1>
  <p><strong>Secure Digital Voting Platform for Organizations</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.4.19-purple.svg)](https://vitejs.dev/)
  
  <p align="center">
    <em>A secure, scalable digital voting platform built with modern web technologies.</em>
  </p>
</div>

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/PushkarPisolkar04/ematdaan.git
cd ematdaan

# Install dependencies
npm install
cd server && npm install && cd ..

# Start development servers
npm run dev:all

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

---

## ✨ Features

- **🔐 Security**: End-to-end encryption, digital signatures, row-level security
- **🏢 Organization Management**: Multi-tenant architecture, secure invitation system, role-based access
- **🗳️ Voting System**: Real-time elections, vote verification, audit logging, PDF reports
- **📧 Email Integration**: OTP verification, invitation emails, SMTP support
- **📊 Analytics**: Real-time statistics, vote tracking, user analytics

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Email**: Nodemailer + SMTP
- **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 📦 Environment Setup

### **1. Local Development**
Create `.env` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
SERVER_PORT=5000
NODE_ENV=development

# Email Configuration (SMTP)
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_password
VITE_SMTP_FROM=your_email@gmail.com

# Application URLs
VITE_APP_URL=http://localhost:3000
VITE_SERVER_URL=http://localhost:5000
```

### **2. Database Setup**
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration: `supabase/migrations/20250101000000_complete_system_reset.sql`
3. Copy your Supabase URL and keys to the environment variables

---

## 🚀 Deployment

### **Frontend (Vercel)**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SERVER_URL` (your Render backend URL)
   - `VITE_APP_URL` (your Vercel frontend URL)

### **Backend (Render)**
1. Connect your GitHub repository to Render
2. Set build command: `cd server && npm install && npm run build`
3. Set start command: `cd server && npm start`
4. Add environment variables in Render dashboard:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SMTP_HOST`, `VITE_SMTP_PORT`, `VITE_SMTP_USER`, `VITE_SMTP_PASS`, `VITE_SMTP_FROM`
   - `VITE_APP_URL`, `VITE_SERVER_URL`
   - `NODE_ENV=production`

---

## 🔧 Available Commands

```bash
# Development
npm run dev:all      # Start both frontend and backend
npm run dev          # Frontend only (port 3000)
npm run server       # Backend only (port 5000)

# Building
npm run build        # Frontend production build
cd server && npm run build  # Backend TypeScript build

# Testing & Quality
npm run test         # Run tests
npm run lint         # Code linting
npm run type-check   # TypeScript check
```

---

## 📱 User Flow

1. **Organization Setup**: Admin creates organization and verifies email
2. **Member Invitation**: Admin invites members via email with secure tokens
3. **Election Creation**: Admin creates elections with candidates and settings
4. **Voting Process**: Members vote securely with encryption and verification
5. **Results & Reports**: View real-time results and generate PDF reports

---

## 🔒 Security Features

- **Vote Encryption**: All votes are encrypted end-to-end
- **Digital Signatures**: Vote integrity verification
- **Row-Level Security**: Database-level access control
- **Rate Limiting**: API protection against abuse
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive data validation

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Style**: TypeScript, ESLint, Prettier

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ for secure digital democracy</p>
  <p>
    <a href="https://github.com/PushkarPisolkar04/ematdaan">GitHub</a> •
    <a href="https://ematdaan.vercel.app">Live Demo</a>
  </p>
</div>
