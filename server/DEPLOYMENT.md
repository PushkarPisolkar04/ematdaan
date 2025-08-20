# Render Deployment Guide

## Environment Variables Required

Set these environment variables in your Render dashboard:

### Supabase Configuration
```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Email Configuration (SMTP)
```
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_password
VITE_SMTP_FROM=your_email@gmail.com
```

### Application URLs
```
VITE_APP_URL=https://ematdaan.vercel.app
```

### Server Configuration
```
SERVER_PORT=5000
NODE_ENV=production
```

## Render Deployment Steps

1. **Connect GitHub Repository**
2. **Create New Web Service**
3. **Select Repository**: Choose your main repository
4. **Root Directory**: Leave empty (deploy from root)
5. **Build Command**: `cd server && npm install && npm run build`
6. **Start Command**: `cd server && npm start`
7. **Environment**: Node
8. **Region**: Choose closest to your users

## Important Notes

- The server will be compiled from TypeScript to JavaScript during build
- Make sure all environment variables are set before deployment
- The server will run on the port provided by Render (usually 5000)
- CORS is configured to allow requests from https://ematdaan.vercel.app 