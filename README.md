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
# Clone and setup
git clone https://github.com/yourusername/ematdaan.git
cd ematdaan
npm install

# Start development
npm run dev:all

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

---

## ✨ Features

### 🔐 **Security**
- End-to-end vote encryption
- Zero-knowledge proofs for privacy
- Merkle tree verification
- Digital signatures
- Row-level security

### 🏢 **Organization Management**
- Multi-tenant architecture
- Secure invitation system
- Role-based access control
- Session management

### 🗳️ **Voting System**
- Real-time elections
- Digital vote receipts
- Vote verification
- Audit logging
- PDF reports

### 📧 **Email Integration**
- OTP verification
- Invitation emails
- Password recovery
- SMTP support

---

## 🛠️ Tech Stack

- **Frontend**: React 18.2.0 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Email**: Nodemailer + SMTP
- **Security**: Custom encryption + JWT + CORS

---

## 📦 Setup

### **1. Environment Variables**
Create `.env` file:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Server
SERVER_PORT=5000
NODE_ENV=development

# Email
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_password
VITE_SMTP_FROM=your_email@gmail.com

# App
VITE_APP_URL=http://localhost:3000
```

### **2. Database Setup**
1. Create Supabase project
2. Run migration: `supabase/migrations/20250101000000_complete_system_reset.sql`
3. Configure environment variables

### **3. Start Development**
```bash
npm run dev:all    # Start both frontend and backend
npm run dev        # Frontend only (port 3000)
npm run server     # Backend only (port 5000)
```

---

## 🔧 Commands

```bash
# Development
npm run dev:all      # Start both servers
npm run dev          # Frontend (port 3000)
npm run server       # Backend (port 5000)

# Building
npm run build        # Production build
npm run preview      # Preview build

# Testing
npm run test         # Run tests
npm run lint         # Code linting
npm run type-check   # TypeScript check
```

---

## 🚀 Deployment

### **Frontend (Vercel)**
```bash
npm run build
vercel --prod
```

### **Backend (Railway/Render)**
```bash
npm run build
npm start
```

### **Database (Supabase)**
- Use Supabase Cloud for production
- Configure environment variables

---

## 📱 User Flow

1. **Organization Setup** - Create org, verify email, invite members
2. **Election Creation** - Admin creates election with candidates
3. **Voting Process** - Members vote securely with encryption
4. **Results & Verification** - View results, verify votes, get receipts

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and test
4. Submit pull request

**Code Style**: TypeScript, ESLint, Prettier

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

<div align="center">
  <p>Made with ❤️ for secure digital democracy</p>
  <p>
    <a href="https://github.com/PushkarPisolkar04/ematdaan">GitHub</a> •
    <a href="https://ematdaan.vercel.app">Live Demo</a>
  </p>
</div>
