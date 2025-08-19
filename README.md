# E-Matdaan SaaS - Secure Digital Voting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)

> **Secure, Scalable Digital Voting Platform for Organizations Worldwide**

E-Matdaan SaaS is a comprehensive multi-tenant digital voting platform designed for schools, colleges, corporations, and government institutions. Built with modern web technologies and enterprise-grade security, it provides a complete solution for conducting secure, transparent, and verifiable elections.

## 🚀 Live Demo

**[View Live Demo](https://ematdaan.vercel.app)** | **[SaaS Landing Page](https://ematdaan.vercel.app/saas)**

## ✨ Key Features

### 🔐 **Multi-Authentication Options**
- **Traditional Email/Password** - No MetaMask required
- **MetaMask Integration** - For advanced users (optional)
- **Email OTP Verification** - Secure two-factor authentication
- **Session Management** - Secure session handling

### 🏢 **Multi-Tenant Architecture**
- **Organization Isolation** - Complete data separation
- **Custom Domains** - Each organization gets their own subdomain
- **Scalable Pricing** - Free, Pro, and Enterprise tiers
- **Admin Management** - Role-based access control

### 🗳️ **Voting Features**
- **End-to-End Encryption** - Votes encrypted before transmission
- **Merkle Tree Verification** - Transparent vote verification
- **Real-Time Results** - Live election updates
- **Audit Logging** - Complete audit trail
- **Vote Receipts** - Cryptographic proof of voting

### 🛡️ **Security & Compliance**
- **Row Level Security (RLS)** - Database-level data protection
- **Multi-Factor Authentication** - Enhanced security
- **Account Locking** - Protection against brute force attacks
- **Session Management** - Secure session handling
- **Audit Trails** - Complete activity logging

## 🛠️ Tech Stack

### **Frontend**
- **React 18.2.0** - Modern UI framework
- **TypeScript 5.0** - Type-safe development
- **TailwindCSS 3.3** - Utility-first CSS framework
- **Vite 4.4** - Fast build tool
- **React Router 6.8** - Client-side routing

### **Backend & Database**
- **Supabase** - Open-source Firebase alternative
- **PostgreSQL** - Reliable relational database
- **Row Level Security (RLS)** - Database security
- **Real-time Subscriptions** - Live updates

### **Authentication & Security**
- **Custom Session Management** - Traditional auth
- **MetaMask Integration** - Web3 authentication
- **Email OTP System** - Two-factor authentication
- **Password Hashing** - Secure credential storage

### **Deployment & Infrastructure**
- **Vercel** - Frontend hosting
- **Supabase Cloud** - Backend services
- **GitHub** - Version control
- **Environment Variables** - Secure configuration

## 📦 Installation & Setup

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Supabase account
- Email service (for OTP)

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/ematdaan.git
cd ematdaan
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Configure your environment variables
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SAAS_MODE=true
VITE_DEFAULT_ORG_SLUG=default
```

### **4. Database Setup**
```bash
# Apply database migrations
npx supabase db push

# Or manually run SQL in Supabase dashboard
```

### **5. Development Server**
```bash
# Start development server
npm run dev

# For concurrent development (with proxy server)
npm run dev:all
```

## 🏗️ SaaS Architecture

### **Multi-Tenant Structure**
```
Organizations
├── Organization A (school.example.com)
│   ├── Users (isolated)
│   ├── Elections (isolated)
│   └── Results (isolated)
├── Organization B (college.example.com)
│   ├── Users (isolated)
│   ├── Elections (isolated)
│   └── Results (isolated)
└── Organization C (corp.example.com)
    ├── Users (isolated)
    ├── Elections (isolated)
    └── Results (isolated)
```

### **Authentication Flow**
1. **Organization Selection** - User selects or is assigned to organization
2. **Authentication** - Traditional email/password or MetaMask
3. **Session Creation** - Secure session token generation
4. **Access Control** - Role-based permissions

### **Data Isolation**
- **Row Level Security (RLS)** - Database-level isolation
- **Organization Context** - Application-level isolation
- **Session Scoping** - User session isolation

## 🚀 Deployment

### **Vercel Deployment**
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### **Environment Variables (Vercel)**
Set these in your Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SAAS_MODE`
- `VITE_DEFAULT_ORG_SLUG`

### **Custom Domains**
1. Configure DNS for your domain
2. Set up subdomain routing
3. Update organization settings

## 📊 Pricing Tiers

### **Free Tier**
- Up to 100 voters
- 5 active elections
- Basic support
- Standard features

### **Pro Tier ($29/month)**
- Up to 1,000 voters
- Unlimited elections
- Priority support
- Custom branding
- Advanced analytics

### **Enterprise Tier (Custom)**
- Unlimited voters
- Unlimited elections
- Dedicated support
- Custom integrations
- SLA guarantee
- On-premise option

## 🔧 Configuration

### **Organization Setup**
1. **Create Organization** - Via SaaS landing page
2. **Configure Domain** - Set custom subdomain
3. **Add Admins** - Assign organization administrators
4. **Customize Settings** - Branding and preferences

### **Security Settings**
- **Password Policies** - Minimum requirements
- **Session Timeout** - Automatic logout
- **Login Attempts** - Account locking
- **Audit Logging** - Activity monitoring

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### **Code Style**
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Add proper documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Documentation**
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [API Documentation](docs/api.md)
- [Security Guide](docs/security.md)

### **Community**
- [GitHub Issues](https://github.com/yourusername/ematdaan/issues)
- [Discussions](https://github.com/yourusername/ematdaan/discussions)
- [Email Support](mailto:support@ematdaan.com)

### **Enterprise Support**
For enterprise customers, we offer:
- Dedicated support channels
- Custom integrations
- On-premise deployment
- Training and consulting

## 🔄 Version History

### **v2.0.0 (Current) - SaaS Platform**
- ✅ Multi-tenant architecture
- ✅ Traditional authentication
- ✅ Organization management
- ✅ Custom domains
- ✅ Role-based access control

### **v1.0.0 - Single Tenant**
- ✅ MetaMask authentication
- ✅ Basic voting system
- ✅ Merkle tree verification
- ✅ Real-time results

## 🗺️ Roadmap

### **Q1 2024**
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] API rate limiting
- [ ] Enhanced security features

### **Q2 2024**
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] Integration marketplace
- [ ] White-label solutions

### **Q3 2024**
- [ ] Blockchain integration
- [ ] Advanced audit features
- [ ] Machine learning insights
- [ ] Enterprise SSO

---

**Built with ❤️ for secure, transparent democracy**
