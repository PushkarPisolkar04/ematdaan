# E-Matdaan: Secure Digital Voting System

<div align="center">

<img src="public/logo.png" alt="E-Matdaan Logo" width="100" height="100">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.7-green.svg)](https://supabase.com/)

[View Live Demo](https://ematdaan.vercel.app)

</div>

E-Matdaan is a secure and verifiable electronic voting system that ensures vote privacy through encryption and provides vote verification using Merkle trees. Built with modern web technologies and focusing on security, transparency, and user experience.

## 🚀 Features

### 🔐 Secure Authentication
- MetaMask wallet integration for cryptographic security
- Two-factor authentication with email OTP
- Decentralized Identity (DID) management

### 🗳️ Private Voting
- Homomorphic encryption for vote privacy
- Merkle tree-based vote verification
- Cryptographic vote receipts
- Real-time vote confirmation

### 📊 Real-time Statistics
- Live voter turnout tracking
- Election progress monitoring
- Interactive result visualization
- Real-time updates via WebSocket

### 👥 Role-based Access
- Secure voter registration and verification
- Administrative dashboard for election management
- Public vote verification portal
- Audit logging and monitoring

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** with TypeScript for robust UI
- **TailwindCSS** for modern, responsive design
- **MetaMask** integration for Web3 functionality
- **Vite** for fast development and building

### Backend
- **Supabase** for backend services
- **PostgreSQL** for secure data storage
- **Row Level Security** for data protection
- **Real-time subscriptions** for live updates

### Security
- **Paillier encryption** for vote privacy
- **Merkle trees** for vote verification
- **MetaMask signatures** for authentication
- **Email OTP** for two-factor auth

## 📋 Prerequisites

- Node.js 18+
- MetaMask browser extension
- Supabase account
- SMTP email service
- Modern web browser (Chrome, Firefox, Edge)

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PushkarPisolkar04/ematdaan.git
   cd ematdaan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your values
   nano .env
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run migrations:
     ```bash
     cd supabase
     npx supabase migration up
     ```

5. **Proxy Server Setup**
   The project uses a proxy server to handle secure communications and prevent CORS issues:
   ```bash
   # Install proxy server dependencies
   cd server
   npm install
   
   # Configure proxy settings
   cp .env.example .env
   # Edit proxy/.env with your settings
   ```

6. **Start Development Environment**
   ```bash
   # Start all services concurrently (frontend, proxy, and development servers)
   npm run dev:all
   
   # Or start services individually:
   npm run dev        # Frontend only
   npm run proxy:dev  # Proxy server only
   ```

7. **Production Build**
   ```bash
   # Build all components
   npm run build:all
   
   # Start production servers
   npm run start:all
   ```

## 🔒 Security Features

### Vote Privacy
- Homomorphic encryption using Paillier cryptosystem
- Zero-knowledge proofs for vote verification
- Secure key management
- End-to-end encryption

### Vote Integrity
- Cryptographic signatures for each vote
- Merkle tree verification system
- Immutable audit logs
- Double-voting prevention

### Access Control
- Role-based permissions
- Row Level Security in database
- Two-factor authentication
- Session management


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Paillier-BigInt](https://github.com/juanelas/paillier-bigint) for homomorphic encryption
- [Supabase](https://supabase.com) for backend infrastructure
- [MetaMask](https://metamask.io) for Web3 integration
- [TailwindCSS](https://tailwindcss.com) for styling
- [Vite](https://vitejs.dev) for build tooling
