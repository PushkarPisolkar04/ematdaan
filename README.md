<div align="center">
  <img src="https://img.shields.io/badge/E--Matdaan-Digital%20Voting%20Platform-6B21E8?style=for-the-badge&logo=vote&logoColor=white" alt="E-Matdaan Logo" />
  <h1>🗳️ E-Matdaan</h1>
  <p><strong>Secure Digital Voting Platform for Organizations</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.4.19-purple.svg)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
  
  <p align="center">
    <em>A comprehensive, secure, and scalable digital voting platform built with modern web technologies.</em>
  </p>
</div>

---

## 🚀 Quick Start

### **Live Demo**
**[View Live Demo](https://ematdaan.vercel.app)** | **[Documentation](https://ematdaan.vercel.app/docs)**

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/yourusername/ematdaan.git
cd ematdaan

# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev:all

# Or start individually
npm run dev      # Frontend (http://localhost:3000)
npm run server   # Backend (http://localhost:5000)
```

---

## ✨ Key Features

### 🔐 **Advanced Security**
- **End-to-End Encryption** - AES-256 vote encryption
- **Zero-Knowledge Proofs** - Vote privacy without revealing choices
- **Merkle Tree Verification** - Transparent vote verification
- **Digital Signatures** - ECDSA signature verification
- **Row Level Security** - Database-level access control

### 🏢 **Organization Management**
- **Multi-Tenant Architecture** - Complete organization isolation
- **Invitation System** - Secure member invitations via email
- **Role-Based Access** - Admin and Student roles
- **Session Management** - Secure session handling with expiration

### 🗳️ **Voting System**
- **Real-Time Elections** - Live election updates
- **Vote Receipts** - Cryptographic proof with QR codes
- **Vote Verification** - Verify your vote was counted correctly
- **Audit Logging** - Complete activity trail
- **PDF Reports** - Election results and audit reports

### 📧 **Email Integration**
- **OTP Verification** - Secure two-factor authentication
- **Invitation Emails** - Automated member invitations
- **Password Recovery** - Secure password reset flow
- **SMTP Integration** - Gmail/Outlook support

---

## 🛠️ Technology Stack

### **Frontend (Port 3000)**
- **React 18.2.0** - Modern UI framework
- **TypeScript 5.2.2** - Type-safe development
- **Vite 5.4.19** - Fast build tool and dev server
- **TailwindCSS 3.4.1** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible components
- **React Router 6.22.2** - Client-side routing

### **Backend (Port 5000)**
- **Node.js** - JavaScript runtime
- **Express.js 4.21.2** - Web framework
- **TypeScript** - Type-safe backend
- **Nodemailer 6.9.12** - Email service
- **Rate Limiting** - API protection
- **Security Headers** - Enhanced security

### **Database & Infrastructure**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Reliable relational database
- **Row Level Security (RLS)** - Database security
- **Real-time Subscriptions** - Live updates
- **Edge Functions** - Serverless functions

### **Security & Authentication**
- **Custom Session Management** - Traditional auth system
- **Email OTP System** - Two-factor authentication
- **Password Hashing** - Secure credential storage
- **JWT Tokens** - Secure session tokens
- **CORS Protection** - Cross-origin security

---

## 📦 Installation & Setup

### **Prerequisites**
- **Node.js 18+** - JavaScript runtime
- **npm or yarn** - Package manager
- **Supabase account** - Database service
- **Email service** - For OTP and invitations

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/ematdaan.git
cd ematdaan
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Configuration**
Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
SERVER_PORT=5000
NODE_ENV=development

# Email Configuration (Gmail/Outlook)
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_password
VITE_SMTP_FROM=your_email@gmail.com

# App Configuration
VITE_APP_URL=http://localhost:3000
```

### **4. Database Setup**
1. **Create Supabase Project** - [supabase.com](https://supabase.com)
2. **Run Migration** - Copy and run the SQL from `supabase/migrations/20250101000000_complete_system_reset.sql`
3. **Configure RLS** - Row Level Security is automatically enabled

### **5. Start Development**
```bash
# Start both frontend and backend
npm run dev:all

# Or start individually
npm run dev      # Frontend: http://localhost:3000
npm run server   # Backend: http://localhost:5000
```

---

## 🗄️ Database Schema

### **Core Tables (15 total)**
- **organizations** - Organization management
- **auth_users** - User authentication
- **user_organizations** - User-org relationships
- **elections** - Election management
- **candidates** - Election candidates
- **votes** - Basic vote records
- **encrypted_votes** - Encrypted vote data
- **merkle_trees** - Vote verification trees
- **zk_proofs** - Zero-knowledge proofs
- **vote_verifications** - Vote verification records
- **user_sessions** - Session management
- **otps** - OTP verification
- **access_tokens** - Invitation tokens
- **audit_logs** - Security audit trail
- **mfa_tokens** - Multi-factor authentication

### **Security Features**
- **Row Level Security (RLS)** - All tables protected
- **Complex Tokens** - 64+ character security tokens
- **Session Expiration** - Automatic cleanup
- **Audit Logging** - Complete activity tracking

---

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start frontend (port 3000)
npm run server       # Start backend (port 5000)
npm run dev:all      # Start both servers

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

---

## 🚀 Deployment

### **Frontend (Vercel)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Backend (Railway/Render)**
```bash
# Set environment variables
SERVER_PORT=5000
NODE_ENV=production

# Deploy
npm run build
npm start
```

### **Database (Supabase)**
- **Production**: Use Supabase Cloud
- **Development**: Use Supabase Local

---

## 📱 User Flows

### **Organization Setup**
1. **Create Organization** - Admin creates org with email/password
2. **Email Verification** - OTP verification required
3. **Invite Members** - Upload CSV or send individual invitations
4. **Member Registration** - Members join via invitation links

### **Election Process**
1. **Create Election** - Admin sets up election with candidates
2. **Activate Election** - Election becomes available for voting
3. **Cast Votes** - Members vote securely with encryption
4. **Get Receipt** - Digital receipt with verification code
5. **Verify Vote** - Verify vote was counted correctly
6. **View Results** - Real-time election results

### **Security Features**
1. **Session Management** - Secure login/logout
2. **Vote Encryption** - End-to-end vote protection
3. **Audit Logging** - Complete activity tracking
4. **Access Control** - Role-based permissions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork and clone
git clone https://github.com/yourusername/ematdaan.git
cd ematdaan

# Install dependencies
npm install

# Start development
npm run dev:all

# Make changes and test
npm run test
npm run lint
```

### **Code Style**
- **TypeScript** - Strict type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Conventional Commits** - Commit message format

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling framework
- **React** - UI framework
- **Express.js** - Backend framework

---

<div align="center">
  <p>Made with ❤️ for secure digital democracy</p>
  <p>
    <a href="https://github.com/yourusername/ematdaan">GitHub</a> •
    <a href="https://ematdaan.vercel.app">Live Demo</a> •
    <a href="https://ematdaan.vercel.app/docs">Documentation</a>
  </p>
</div>
