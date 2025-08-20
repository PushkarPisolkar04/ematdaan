## **🔧 DATABASE FUNCTIONS**

### **1. TOKEN GENERATION FUNCTIONS**
```sql
-- Generate complex invitation tokens (64+ characters)
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(48), 'base64') || 
           encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate complex session tokens (64+ characters)
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex') || 
           encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate complex OTP (6 digits)
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
    RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **2. VALIDATION FUNCTIONS**
```sql
-- Validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE(
    token_id UUID,
    organization_id UUID,
    role TEXT,
    election_id UUID,
    is_valid BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.organization_id,
        at.role,
        at.election_id,
        (at.is_active = true AND at.expires_at > NOW() AND at.used_count < at.usage_limit) as is_valid,
        CASE 
            WHEN at.is_active = false THEN 'Token is inactive'
            WHEN at.expires_at <= NOW() THEN 'Token has expired'
            WHEN at.used_count >= at.usage_limit THEN 'Token usage limit exceeded'
            ELSE 'Valid token'
        END as reason
    FROM access_tokens at
    WHERE at.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate session token
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE(
    user_id UUID,
    organization_id UUID,
    role TEXT,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.organization_id,
        uo.role,
        (us.is_active = true AND us.expires_at > NOW()) as is_valid
    FROM user_sessions us
    JOIN user_organizations uo ON us.user_id = uo.user_id AND us.organization_id = uo.organization_id
    WHERE us.session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has voted
CREATE OR REPLACE FUNCTION has_user_voted(p_user_id UUID, p_election_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM votes 
        WHERE user_id = p_user_id AND election_id = p_election_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **3. SESSION MANAGEMENT FUNCTIONS**
```sql
-- Create user session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_organization_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    session_token TEXT;
BEGIN
    session_token := generate_session_token();
    
    INSERT INTO user_sessions (
        user_id,
        organization_id,
        session_token,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        p_organization_id,
        session_token,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '24 hours'
    );
    
    PERFORM log_audit_event(p_organization_id, p_user_id, 'session_created', 
                           jsonb_build_object('ip_address', p_ip_address, 'user_agent', p_user_agent));
    
    RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invalidate session
CREATE OR REPLACE FUNCTION invalidate_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record FROM user_sessions WHERE session_token = p_session_token;
    
    IF session_record IS NULL THEN
        RETURN false;
    END IF;
    
    UPDATE user_sessions 
    SET is_active = false 
    WHERE session_token = p_session_token;
    
    PERFORM log_audit_event(session_record.organization_id, session_record.user_id, 'session_invalidated', '{}');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **4. AUDIT & LOGGING FUNCTIONS**
```sql
-- Log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_organization_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_action,
        p_details,
        inet_client_addr(),
        current_setting('request.headers')::jsonb->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## **🛡️ ROW LEVEL SECURITY (RLS) POLICIES**

### **1. CORE TABLES POLICIES**
```sql
-- ORGANIZATIONS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_read_own" ON organizations
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "organizations_admin" ON organizations
    FOR ALL TO service_role
    USING (true);

-- AUTH_USERS
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_users_read_own" ON auth_users
    FOR SELECT TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_update_own" ON auth_users
    FOR UPDATE TO authenticated
    USING (id = current_setting('app.user_id')::uuid);

CREATE POLICY "auth_users_insert" ON auth_users
    FOR INSERT TO service_role
    WITH CHECK (true);

-- USER_ORGANIZATIONS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_organizations_read_own" ON user_organizations
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "user_organizations_admin_read" ON user_organizations
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- ELECTIONS
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elections_read_org" ON elections
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "elections_admin_manage" ON elections
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- CANDIDATES
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_read_org" ON candidates
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "candidates_admin_manage" ON candidates
    FOR ALL TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- VOTES
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_read_own" ON votes
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "votes_insert_own" ON votes
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = current_setting('app.user_id')::uuid AND
        NOT EXISTS (
            SELECT 1 FROM votes 
            WHERE user_id = current_setting('app.user_id')::uuid 
            AND election_id = votes.election_id
        )
    );

CREATE POLICY "votes_admin_read" ON votes
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));
```

### **2. ADVANCED SECURITY TABLES POLICIES**
```sql
-- ENCRYPTED_VOTES
ALTER TABLE encrypted_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encrypted_votes_read_own" ON encrypted_votes
    FOR SELECT TO authenticated
    USING (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "encrypted_votes_insert_own" ON encrypted_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "encrypted_votes_admin_read" ON encrypted_votes
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- MERKLE_TREES
ALTER TABLE merkle_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merkle_trees_read_org" ON merkle_trees
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "merkle_trees_admin_manage" ON merkle_trees
    FOR ALL TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- ZK_PROOFS
ALTER TABLE zk_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zk_proofs_read_own" ON zk_proofs
    FOR SELECT TO authenticated
    USING (vote_id IN (
        SELECT id FROM encrypted_votes 
        WHERE voter_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "zk_proofs_insert_own" ON zk_proofs
    FOR INSERT TO authenticated
    WITH CHECK (vote_id IN (
        SELECT id FROM encrypted_votes 
        WHERE voter_id = current_setting('app.user_id')::uuid
    ));

CREATE POLICY "zk_proofs_admin_read" ON zk_proofs
    FOR SELECT TO authenticated
    USING (election_id IN (
        SELECT e.id FROM elections e
        JOIN user_organizations uo ON e.organization_id = uo.organization_id
        WHERE uo.user_id = current_setting('app.user_id')::uuid 
        AND uo.role = 'admin'
    ));

-- VOTE_VERIFICATIONS
ALTER TABLE vote_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_verifications_read_own" ON vote_verifications
    FOR SELECT TO authenticated
    USING (voter_id = current_setting('app.user_id')::uuid);

CREATE POLICY "vote_verifications_insert_own" ON vote_verifications
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = current_setting('app.user_id')::uuid);

-- MFA_TOKENS
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfa_tokens_read_own" ON mfa_tokens
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "mfa_tokens_insert_own" ON mfa_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);
```

### **3. SESSION & VERIFICATION TABLES POLICIES**
```sql
-- USER_SESSIONS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_own" ON user_sessions
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "sessions_insert_own" ON user_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- OTPS
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "otps_validate" ON otps
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "otps_service_manage" ON otps
    FOR ALL TO service_role
    USING (true);

-- ACCESS_TOKENS
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_tokens_validate" ON access_tokens
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "access_tokens_admin_manage" ON access_tokens
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

-- AUDIT_LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_read_own" ON audit_logs
    FOR SELECT TO authenticated
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY "audit_logs_admin_read" ON audit_logs
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = current_setting('app.user_id')::uuid 
        AND role = 'admin'
    ));

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
```

---

## **🔧 DATABASE INDEXES**
```sql
-- Core tables indexes
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX idx_elections_org ON elections(organization_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_votes_user_election ON votes(user_id, election_id);
CREATE INDEX idx_votes_election ON votes(election_id);

-- Advanced security tables indexes
CREATE INDEX idx_encrypted_votes_election ON encrypted_votes(election_id);
CREATE INDEX idx_encrypted_votes_voter ON encrypted_votes(voter_id);
CREATE INDEX idx_merkle_trees_election ON merkle_trees(election_id);
CREATE INDEX idx_zk_proofs_vote ON zk_proofs(vote_id);
CREATE INDEX idx_zk_proofs_election ON zk_proofs(election_id);
CREATE INDEX idx_vote_verifications_vote ON vote_verifications(vote_id);
CREATE INDEX idx_vote_verifications_voter ON vote_verifications(voter_id);
CREATE INDEX idx_mfa_tokens_user ON mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_expires ON mfa_tokens(expires_at);

-- Session & verification tables indexes
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_org ON access_tokens(organization_id);
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_otp ON otps(otp);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
```

---

## **🌐 API ENDPOINTS**

### **1. FRONTEND API ROUTES (React Router)**
```typescript
// Public routes
/                           // Landing page
/auth                       // Login/Register page
/forgot-password           // Password reset request
/reset-password            // Password reset form

// Protected routes
/dashboard                  // User dashboard
/admin                      // Admin panel
/vote/:electionId          // Voting interface
/verify-vote/:receipt      // Vote verification
/results/:electionId       // Election results
/profile                   // User profile

// 404
/*                          // Not found page
```

### **2. BACKEND API ENDPOINTS (Express Server)**
```typescript
// Email endpoints
POST /api/send-otp                    // Send OTP email
POST /api/send-access-codes           // Send access codes email
POST /api/send-password-reset         // Send password reset email
POST /api/send-invitation             // Send invitation email

// Health check
GET /api/health                       // Server health check

// Proxy endpoints (Vite)
/api/*                               // Proxy to backend server
```

### **3. SUPABASE API FUNCTIONS**
```typescript
// Authentication
authApi.signUp(email, password)       // User registration
authApi.signIn(email, password)       // User login
authApi.signOut()                     // User logout
authApi.getSession()                  // Get current session

// Database functions
validate_session(token)               // Validate session token
validate_invitation_token(token)      // Validate invitation token
create_user_session(userId, orgId)    // Create new session
invalidate_session(token)             // Invalidate session
has_user_voted(userId, electionId)    // Check if user voted
log_audit_event(orgId, userId, action) // Log audit event
cleanup_expired_sessions()            // Cleanup expired sessions
```

---

## **📁 FILE STRUCTURE**

### **1. KEEP THESE WORKING FILES**
```bash
# WORKING AUTH & EMAIL SYSTEMS
✅ src/lib/api/auth.ts (complete auth implementation)
✅ src/lib/otp.ts (OTP system)
✅ src/lib/passwordRecovery.ts (password reset)
✅ src/lib/validation.ts (form validation)
✅ src/lib/invitationSystem.ts (invitation system)
✅ src/lib/email.ts (email sending)
✅ src/lib/emailService.ts (Gmail SMTP)

# WORKING ADVANCED SECURITY
✅ src/lib/merkle.ts (Merkle trees)
✅ src/lib/zkProofs.ts (Zero-knowledge proofs)
✅ src/lib/advancedSecurity.ts (advanced security)
✅ src/lib/voteSecurity.ts (vote encryption)
✅ src/lib/receipt.ts (PDF receipts)

# WORKING UTILITIES
✅ src/lib/utils.ts (utilities)
✅ src/lib/encryption.ts (encryption)

# WORKING API ENDPOINTS
✅ src/pages/api/send-otp.ts (OTP email API)
✅ src/pages/api/send-access-codes.ts (access codes API)
✅ server/index.ts (Express server)

# WORKING PAGES
✅ src/pages/Index.tsx (landing page)
✅ src/pages/Login.tsx (unified login)
✅ src/pages/Dashboard.tsx (user dashboard)
✅ src/pages/Admin.tsx (admin panel)
✅ src/pages/Vote.tsx (voting interface)
✅ src/pages/VerifyVote.tsx (vote verification)
✅ src/pages/VoteReceipt.tsx (receipt display)
✅ src/pages/Results.tsx (results)
✅ src/pages/Profile.tsx (user profile)
✅ src/pages/ForgotPassword.tsx (password reset)
✅ src/pages/ResetPassword.tsx (password reset)
✅ src/pages/NotFound.tsx (404)

# WORKING COMPONENTS
✅ src/components/Navbar.tsx (navigation)
✅ src/components/ui/ (shadcn components)
✅ src/components/FeatureSection.tsx
✅ src/components/StatsSection.tsx
✅ src/components/HowItWorks.tsx
✅ src/components/FAQSection.tsx
✅ src/components/VoteReceiptCard.tsx
✅ src/components/CountdownTimer.tsx

# WORKING API LIBRARIES
✅ src/lib/api/traditionalAuth.ts (auth functions)
✅ src/lib/api/voting.ts (voting functions)
✅ src/lib/api/election.ts (election functions)
✅ src/lib/api/stats.ts (statistics)
```

### **2. REMOVE THESE BROKEN/UNNECESSARY FILES**
```bash
# BROKEN AUTH SYSTEMS
❌ src/pages/SimpleLogin.tsx (DUPLICATE - keep only Login.tsx)
❌ src/hooks/useAuth.ts (BROKEN - inconsistent auth state)
❌ src/contexts/OrganizationContext.tsx (BROKEN - doesn't work properly)
❌ src/lib/metamask.ts (UNNECESSARY - blockchain not needed)
❌ src/lib/did.ts (UNNECESSARY - DID not needed)
❌ src/lib/socket.ts (UNNECESSARY - WebSocket not needed)

# BROKEN ANTI-FRAUD SYSTEMS
❌ src/lib/antiFraudSystem.ts (BROKEN - complex and not working)
❌ src/lib/emailFraudPrevention.ts (BROKEN - overcomplicated)
❌ src/lib/sharedSystemDetection.ts (BROKEN - not functional)
❌ src/lib/securityAudit.ts (BROKEN - complex audit system)

# BROKEN BACKUP SYSTEMS
❌ src/lib/cleanup.ts (BROKEN - cleanup not working)
❌ src/lib/pdfReports.ts (BROKEN - report generation broken)
❌ src/lib/userActivity.ts (BROKEN - activity tracking broken)

# BROKEN NOTIFICATION SYSTEMS
❌ src/lib/notifications.ts (BROKEN - notification system broken)
❌ src/lib/encryption.test.ts (BROKEN - test file)
❌ src/lib/session.ts (BROKEN - session management broken)
```

### **3. CREATE THESE NEW FILES**
```bash
# NEW AUTH CONTEXT
🔧 src/contexts/AuthContext.tsx (unified auth context)
🔧 src/components/ProtectedRoute.tsx (auth protection)
🔧 src/hooks/useSessionRefresh.ts (session refresh)

# NEW NAVIGATION
🔧 src/components/RoleBasedNavbar.tsx (role-based navigation)

# NEW UTILITIES
🔧 src/lib/errorHandler.ts (proper error handling)
🔧 src/lib/storage.ts (unified storage management)
```

---

## **🔧 IMPLEMENTATION STEPS**

### **Step 1: Database Setup**
1. Create all 15 tables with proper relationships
2. Add all RLS policies for security
3. Create all functions for token generation and validation
4. Add all indexes for performance
5. Set up audit logging system

### **Step 2: File Cleanup**
1. Delete all broken/unnecessary files
2. Keep all working advanced security systems
3. Fix localStorage usage
4. Remove console logging
5. Create unified AuthContext

### **Step 3: Authentication Fix**
1. Create unified AuthContext
2. Fix session management
3. Fix login/logout flow
4. Fix page reload issues
5. Add proper error handling

### **Step 4: Navigation Fix**
1. Fix navbar role-based navigation
2. Fix vote button behavior
3. Fix admin access restrictions
4. Add proper protected routes
5. Fix session persistence

### **Step 5: Advanced Security Integration**
1. Integrate working Merkle trees
2. Integrate working ZK proofs
3. Integrate working vote encryption
4. Integrate working receipt system
5. Test all security features

### **Step 6: Testing & Validation**
1. Test all user flows
2. Verify session persistence
3. Test role-based access
4. Validate security measures
5. Test email functionality

---

## **🔒 SECURITY FEATURES**

### **1. Authentication Security**
- ✅ **OTP Verification** (6-digit codes)
- ✅ **Session Management** (24-hour sessions)
- ✅ **Password Hashing** (bcrypt)
- ✅ **Rate Limiting** (login attempts)
- ✅ **Account Locking** (failed attempts)

### **2. Vote Security**
- ✅ **Merkle Trees** (vote verification)
- ✅ **Zero-Knowledge Proofs** (privacy)
- ✅ **Vote Encryption** (AES-GCM)
- ✅ **Digital Signatures** (ECDSA)
- ✅ **Double Voting Prevention** (database constraints)

### **3. Data Security**
- ✅ **Row Level Security** (RLS policies)
- ✅ **Audit Logging** (all activities)
- ✅ **Complex Tokens** (64+ characters)
- ✅ **Session Validation** (server-side)
- ✅ **IP Tracking** (security monitoring)

### **4. Email Security**
- ✅ **SMTP Authentication** (Gmail)
- ✅ **Email Verification** (OTP)
- ✅ **Password Reset** (secure tokens)
- ✅ **Invitation System** (secure links)

---

## **👥 USER FLOWS**

### **1. Organization Creation Flow**
```
1. Admin visits /auth
2. Clicks "Create Organization"
3. Fills: org_name, admin_name, admin_email, password
4. System creates organization + admin user
5. Sends OTP to admin_email
6. Admin verifies OTP → redirected to admin dashboard
```

### **2. Student Invitation Flow**
```
1. Admin uploads CSV with student emails
2. System creates access_tokens for each email
3. System sends invitation emails with tokens
4. Student clicks link → /auth?token=xxx
5. Student registers with token → OTP verification
6. Student verified → redirected to dashboard
```

### **3. Voting Flow**
```
1. Student sees active elections on dashboard
2. Clicks "Vote" → goes to /vote/:electionId
3. Selects candidate → confirmation
4. System creates encrypted vote + receipt
5. Redirects to /verify-vote/:receipt
6. Student can verify their vote
```

### **4. Admin Management Flow**
```
1. Admin logs in → goes to /admin
2. Uploads student CSV → creates invitations
3. Creates election → adds candidates
4. Sets election dates → activates election
5. Monitors results → views statistics
```

---

## **📦 DEPENDENCIES**

### **1. CORE DEPENDENCIES (KEEP)**
```json
{
  "@supabase/supabase-js": "^2.39.3",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.22.2",
  "typescript": "^5.2.2",
  "vite": "^5.0.8"
}
```

### **2. UI DEPENDENCIES (KEEP)**
```json
{
  "@radix-ui/react-*": "^1.0.0",
  "lucide-react": "^0.321.0",
  "tailwindcss": "^3.4.1",
  "framer-motion": "^11.0.3",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0"
}
```

### **3. SECURITY DEPENDENCIES (KEEP)**
```json
{
  "ethers": "^6.11.1",
  "bcryptjs": "^3.0.2",
  "crypto-js": "^4.2.0",
  "jspdf": "^3.0.1",
  "html2canvas": "^1.4.1",
  "qrcode": "^1.5.4"
}
```

### **4. EMAIL DEPENDENCIES (KEEP)**
```json
{
  "nodemailer": "^6.9.12",
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5"
}
```

### **5. REMOVE UNNECESSARY DEPENDENCIES**
```json
{
  "@emailjs/browser": "^4.4.1",
  "emailjs-com": "^3.2.0",
  "socket.io-client": "^4.8.1",
  "paillier-bigint": "^3.4.3",
  "paillier-js": "^0.9.3"
}
```

---

## **🔧 ENVIRONMENT VARIABLES**

### **1. SUPABASE CONFIGURATION**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **2. EMAIL CONFIGURATION**
```env
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_password
VITE_SMTP_FROM=your_email@gmail.com
```

### **3. SERVER CONFIGURATION**
```env
SERVER_PORT=5000
NODE_ENV=production
```

### **4. SECURITY CONFIGURATION**
```env
VITE_ADMIN_ADDRESS=your_admin_wallet_address
VITE_JWT_SECRET=your_jwt_secret
VITE_ENCRYPTION_KEY=your_encryption_key
```

---

## **✅ FINAL RESULT**

### **Complete, Secure, Working System:**
- **15 database tables** (including all security tables)
- **Complete RLS policies** (all tables protected)
- **Working advanced security** (Merkle trees, ZK proofs, encryption)
- **Working receipt system** (PDF generation, QR codes)
- **Fixed authentication** (unified context, session persistence)
- **Fixed navigation** (role-based, proper access control)
- **Clean codebase** (no broken files, proper error handling)
- **Complex, long tokens** (64+ characters for security)
- **Complete audit trail** (all activities logged)
- **Working email system** (SMTP integration)
- **Proper API endpoints** (Express server)
- **Role-based access control** (admin vs student)
- **Session persistence** (works on page reload)
- **Vote verification** (receipt system)
- **Security monitoring** (audit logs)

This plan provides a **complete, secure, and working** voting system that keeps all the advanced security features while fixing all the issues we discussed.

---

## **🖥️ DETAILED UI/UX BREAKDOWN**

### **1. LANDING PAGE (/ - Index.tsx)**

#### **Header Section:**
- **Logo:** "E-Matdaan" with voting icon
- **Navigation Menu:**
  - Home (current page)
  - FAQs (scrolls to FAQ section)
  - Vote (redirects to /auth if not logged in, /dashboard if logged in)
  - Login (redirects to /auth)
- **User Menu (if logged in):**
  - Profile dropdown with user name
  - Profile link
  - Logout option

#### **Hero Section:**
- **Main Heading:** "Secure Digital Voting Platform"
- **Subheading:** "Transparent, tamper-proof elections for organizations"
- **Call-to-Action Buttons:**
  - "Get Started" (redirects to /auth)
  - "Learn More" (scrolls to features section)
- **Background:** Animated voting interface mockup

#### **Features Section:**
- **Feature Cards:**
  - 🔒 **Secure Voting** - End-to-end encryption
  - 📊 **Real-time Results** - Live election statistics
  - ✅ **Vote Verification** - Receipt-based verification
  - 🏛️ **Multi-tenant** - Support for multiple organizations
  - 📱 **Mobile Friendly** - Responsive design
  - 🎯 **Easy Setup** - Simple organization creation

#### **How It Works Section:**
- **Step 1:** Create Organization
- **Step 2:** Invite Members
- **Step 3:** Create Elections
- **Step 4:** Vote Securely
- **Step 5:** Get Results

#### **Statistics Section:**
- **Live Stats:**
  - Total Elections: [dynamic count]
  - Active Elections: [dynamic count]
  - Total Votes: [dynamic count]
  - Registered Users: [dynamic count]

#### **FAQ Section:**
- **Accordion-style questions:**
  - "How secure is the voting system?"
  - "Can I verify my vote?"
  - "How do I create an organization?"
  - "What happens if I lose my invitation?"
  - "Can admins see individual votes?"
  - "How are results calculated?"

#### **Footer:**
- **Links:**
  - Privacy Policy
  - Terms of Service
  - Contact Support
  - GitHub Repository
- **Social Media:** Twitter, LinkedIn, GitHub

---

### **2. LOGIN/REGISTER PAGE (/auth - Login.tsx)**

#### **Page Header:**
- **Title:** "Welcome to E-Matdaan"
- **Subtitle:** "Secure digital voting platform"

#### **Main Content Area:**
- **Tab Navigation:**
  - "Login" tab (default)
  - "Create Organization" tab
  - "Join Organization" tab

#### **LOGIN TAB:**
- **Form Fields:**
  - Email input (required)
  - Password input (required, with show/hide toggle)
- **Buttons:**
  - "Send OTP" button (triggers OTP to email)
  - "Forgot Password?" link (redirects to /forgot-password)
- **OTP Verification Section (appears after OTP sent):**
  - 6-digit OTP input field
  - "Verify OTP" button
  - "Resend OTP" link (30-second cooldown)
  - "Change Email" link

#### **CREATE ORGANIZATION TAB:**
- **Form Fields:**
  - Organization Name (required)
  - Admin Name (required)
  - Admin Email (required)
  - Password (required, with strength indicator)
  - Confirm Password (required)
- **Buttons:**
  - "Create Organization" button
  - "Terms & Conditions" checkbox (required)
- **OTP Verification Section:**
  - Same as login tab

#### **JOIN ORGANIZATION TAB:**
- **Form Fields:**
  - Invitation Token (required, with paste button)
  - Full Name (required)
  - Email (required)
  - Password (required)
  - Confirm Password (required)
- **Buttons:**
  - "Join Organization" button
  - "I don't have a token" link (shows help text)
- **OTP Verification Section:**
  - Same as login tab

#### **Side Panel (Right Side):**
- **Feature Highlights:**
  - "🔒 End-to-end encryption"
  - "📊 Real-time results"
  - "✅ Vote verification"
  - "🏛️ Multi-tenant support"
- **Testimonial Section:**
  - Quote from satisfied organization
  - Organization name and role

---

### **3. FORGOT PASSWORD PAGE (/forgot-password - ForgotPassword.tsx)**

#### **Page Content:**
- **Title:** "Reset Your Password"
- **Description:** "Enter your email to receive a password reset link"
- **Form:**
  - Email input field (required)
  - "Send Reset Link" button
- **Back to Login:** Link to return to /auth
- **Help Text:** "Check your email for the reset link"

---

### **4. RESET PASSWORD PAGE (/reset-password - ResetPassword.tsx)**

#### **Page Content:**
- **Title:** "Set New Password"
- **Description:** "Enter your new password"
- **Form:**
  - New Password input (required, with strength indicator)
  - Confirm Password input (required)
  - "Reset Password" button
- **Token Validation:** Automatically validates reset token from URL

---

### **5. USER DASHBOARD (/dashboard - Dashboard.tsx)**

#### **Page Header:**
- **Welcome Message:** "Welcome back, [User Name]"
- **Organization:** "[Organization Name]"
- **Quick Stats:**
  - Total Elections: [count]
  - Participated: [count]
  - Upcoming: [count]
  - Active: [count]

#### **Navigation Tabs:**
- **Active Elections** (default tab)
- **Upcoming Elections**
- **Past Elections**
- **My Votes**

#### **ACTIVE ELECTIONS TAB:**
- **Election Cards:**
  - Election Name
  - Description
  - Start Date & Time
  - End Date & Time
  - Status Badge: "Active"
  - **Action Buttons:**
    - "Vote Now" (if not voted, redirects to /vote/:electionId)
    - "Already Voted" (if voted, shows checkmark)
    - "View Results" (if election ended)

#### **UPCOMING ELECTIONS TAB:**
- **Election Cards:**
  - Election Name
  - Description
  - Start Date & Time
  - End Date & Time
  - Status Badge: "Upcoming"
  - **Action Buttons:**
    - "Remind Me" (sets notification)
    - "View Details"

#### **PAST ELECTIONS TAB:**
- **Election Cards:**
  - Election Name
  - Description
  - End Date
  - Status Badge: "Completed"
  - **Action Buttons:**
    - "View Results" (redirects to /results/:electionId)
    - "View My Vote" (shows receipt)

#### **MY VOTES TAB:**
- **Vote History:**
  - Election Name
  - Vote Date
  - Receipt ID
  - **Action Buttons:**
    - "Verify Vote" (redirects to /verify-vote/:receipt)
    - "Download Receipt" (PDF download)

#### **Sidebar:**
- **Quick Actions:**
  - "View Profile" button
  - "Change Password" button
  - "Logout" button
- **Notifications:**
  - List of recent notifications
  - "Mark All Read" button

---

### **6. ADMIN DASHBOARD (/admin - Admin.tsx)**

#### **Page Header:**
- **Welcome Message:** "Admin Dashboard - [Organization Name]"
- **Quick Stats:**
  - Total Members: [count]
  - Active Elections: [count]
  - Total Votes: [count]
  - Pending Invitations: [count]

#### **Navigation Tabs:**
- **Overview** (default tab)
- **Elections**
- **Members**
- **Invitations**
- **Results**
- **Settings**

#### **OVERVIEW TAB:**
- **Recent Activity:**
  - Latest votes cast
  - New member registrations
  - Election status changes
- **Quick Actions:**
  - "Create New Election" button
  - "Invite Members" button
  - "View All Results" button

#### **ELECTIONS TAB:**
- **Election Management:**
  - **Create Election Section:**
    - Election Name input
    - Description textarea
    - Start Date & Time picker
    - End Date & Time picker
    - "Create Election" button
  - **Election List:**
    - Election Name
    - Status (Draft/Active/Completed)
    - Start/End dates
    - Vote count
    - **Action Buttons:**
      - "Edit" (opens edit modal)
      - "Manage Candidates" (redirects to candidate management)
      - "Activate/Deactivate" toggle
      - "Delete" (with confirmation)
      - "View Results" (if completed)

#### **MEMBERS TAB:**
- **Member Management:**
  - **Search/Filter:**
    - Search by name/email
    - Filter by role (Admin/Student)
    - Filter by status (Active/Inactive)
  - **Member List:**
    - Name
    - Email
    - Role
    - Join Date
    - Last Login
    - **Action Buttons:**
      - "Change Role" (Admin ↔ Student)
      - "Deactivate/Activate"
      - "Remove" (with confirmation)

#### **INVITATIONS TAB:**
- **Invitation Management:**
  - **Bulk Invite Section:**
    - CSV file upload
    - "Download Template" link
    - "Send Invitations" button
  - **Individual Invite:**
    - Email input
    - Role selector (Admin/Student)
    - "Send Invitation" button
  - **Invitation List:**
    - Email
    - Role
    - Status (Sent/Pending/Accepted)
    - Sent Date
    - **Action Buttons:**
      - "Resend" (if pending)
      - "Revoke" (if not accepted)

#### **RESULTS TAB:**
- **Election Results:**
  - Election selector dropdown
  - **Results Display:**
    - Candidate names
    - Vote counts
    - Percentages
    - Bar chart visualization
  - **Export Options:**
    - "Export to PDF" button
    - "Export to CSV" button
  - **Detailed Results:**
    - Vote breakdown by time
    - Participation statistics

#### **SETTINGS TAB:**
- **Organization Settings:**
  - Organization Name (editable)
  - Admin Email (editable)
  - **Security Settings:**
    - Enable/disable OTP verification
    - Session timeout settings
    - Password policy settings
  - **Notification Settings:**
    - Email notifications toggle
    - Election reminders toggle
  - **Save Changes** button

#### **Sidebar:**
- **Quick Actions:**
  - "Create Election" button
  - "Invite Members" button
  - "View Analytics" button
- **System Status:**
  - Database health
  - Email service status
  - Active sessions count

---

### **7. VOTING PAGE (/vote/:electionId - Vote.tsx)**

#### **Page Header:**
- **Election Title:** "[Election Name]"
- **Description:** "[Election Description]"
- **Time Remaining:** Countdown timer
- **Status:** "Voting in Progress"

#### **Voting Interface:**
- **Instructions:**
  - "Select your preferred candidate"
  - "You can only vote once"
  - "Your vote is encrypted and secure"
- **Candidate Cards:**
  - Candidate photo/avatar
  - Candidate name
  - Party/affiliation (if applicable)
  - Symbol/logo (if applicable)
  - **Selection:**
    - Radio button for selection
    - "Select" button
- **Vote Confirmation:**
  - Selected candidate display
  - "Confirm Vote" button
  - "Change Selection" button

#### **Security Features:**
- **Progress Indicator:**
  - Step 1: Select Candidate
  - Step 2: Confirm Vote
  - Step 3: Encrypt & Submit
  - Step 4: Generate Receipt
- **Security Badges:**
  - "🔒 Encrypted"
  - "✅ Verifiable"
  - "🛡️ Tamper-proof"

#### **Vote Receipt:**
- **Receipt Display:**
  - Receipt ID
  - Election name
  - Vote timestamp
  - QR code for verification
- **Action Buttons:**
  - "Download Receipt" (PDF)
  - "Verify Vote" (redirects to /verify-vote/:receipt)
  - "Return to Dashboard"

---

### **8. VOTE VERIFICATION PAGE (/verify-vote/:receipt - VerifyVote.tsx)**

#### **Page Header:**
- **Title:** "Vote Verification"
- **Receipt ID:** "[Receipt ID]"

#### **Verification Interface:**
- **Receipt Details:**
  - Election name
  - Vote timestamp
  - Voter information (anonymized)
- **Verification Status:**
  - "✅ Vote Verified" (if valid)
  - "❌ Vote Invalid" (if tampered)
  - "⏳ Processing" (while verifying)
- **Verification Details:**
  - Merkle tree proof
  - Digital signature verification
  - ZK proof validation

#### **Action Buttons:**
- "Download Receipt" (PDF)
- "Share Receipt" (copy link)
- "Return to Dashboard"

---

### **9. RESULTS PAGE (/results/:electionId - Results.tsx)**

#### **Page Header:**
- **Election Title:** "[Election Name]"
- **Status:** "Results Finalized"
- **Total Votes:** "[Count] votes cast"

#### **Results Display:**
- **Winner Announcement:**
  - Winner name and photo
  - Vote count and percentage
  - "🏆 Winner" badge
- **All Candidates:**
  - Ranked by vote count
  - Name and photo
  - Vote count and percentage
  - Progress bar visualization

#### **Charts & Analytics:**
- **Bar Chart:** Vote distribution
- **Pie Chart:** Percentage breakdown
- **Timeline Chart:** Voting activity over time
- **Participation Stats:**
  - Total eligible voters
  - Votes cast
  - Participation percentage

#### **Export Options:**
- "Download Results PDF" button
- "Download Results CSV" button
- "Share Results" button

---

### **10. PROFILE PAGE (/profile - Profile.tsx)**

#### **Page Header:**
- **Profile Photo:** User avatar
- **User Info:**
  - Full name
  - Email address
  - Role (Admin/Student)
  - Organization

#### **Profile Sections:**
- **Personal Information:**
  - Name (editable)
  - Email (read-only)
  - Phone number (optional)
- **Security Settings:**
  - "Change Password" button
  - "Enable 2FA" toggle
  - "Session Management" link
- **Voting History:**
  - List of participated elections
  - Vote receipts
  - "View All" link

#### **Action Buttons:**
- "Save Changes" button
- "Cancel" button
- "Delete Account" button (with confirmation)

---

### **11. NAVIGATION COMPONENTS**

#### **Navbar (All Pages):**
- **Logo:** "E-Matdaan" (links to home)
- **Navigation Links:**
  - Home (/)
  - FAQs (#faqs)
  - Vote (role-based: /auth or /dashboard)
- **User Menu (if authenticated):**
  - User avatar/name
  - Dropdown menu:
    - Profile (/profile)
    - Dashboard (/dashboard)
    - Admin Panel (/admin) - admin only
    - Logout
- **Mobile Menu:** Hamburger menu for mobile

#### **Sidebar (Dashboard/Admin):**
- **Organization Info:**
  - Organization name
  - User role
- **Navigation Links:**
  - Dashboard
  - Elections
  - Members (admin only)
  - Results
  - Settings (admin only)
- **Quick Actions:**
  - Create Election (admin only)
  - Invite Members (admin only)

---

### **12. MODAL DIALOGS**

#### **Confirmation Modals:**
- **Delete Confirmation:**
  - "Are you sure you want to delete [item]?"
  - "This action cannot be undone."
  - "Cancel" and "Delete" buttons
- **Logout Confirmation:**
  - "Are you sure you want to logout?"
  - "Cancel" and "Logout" buttons

#### **Information Modals:**
- **Help Modal:**
  - Context-sensitive help content
  - Step-by-step instructions
  - "Got it" button
- **Error Modal:**
  - Error message
  - Suggested actions
  - "Try Again" button

#### **Form Modals:**
- **Edit Election Modal:**
  - Pre-filled form fields
  - "Save Changes" and "Cancel" buttons
- **Add Candidate Modal:**
  - Name, party, symbol fields
  - "Add Candidate" and "Cancel" buttons

---

### **13. NOTIFICATIONS & TOASTS**

#### **Success Notifications:**
- "Vote submitted successfully!"
- "Organization created successfully!"
- "Invitation sent successfully!"
- "Password changed successfully!"

#### **Error Notifications:**
- "Invalid OTP. Please try again."
- "Session expired. Please login again."
- "You have already voted in this election."
- "Access denied. Admin privileges required."

#### **Warning Notifications:**
- "Election ends in 1 hour."
- "You have pending invitations."
- "Password will expire in 7 days."

#### **Info Notifications:**
- "New election created: [Election Name]"
- "Voting has started for: [Election Name]"
- "Results are now available for: [Election Name]"

---

### **14. RESPONSIVE DESIGN**

#### **Desktop (1024px+):**
- Full navigation menu
- Sidebar visible
- Multi-column layouts
- Hover effects

#### **Tablet (768px - 1023px):**
- Collapsible navigation
- Stacked layouts
- Touch-friendly buttons
- Swipe gestures

#### **Mobile (320px - 767px):**
- Hamburger menu
- Single-column layouts
- Large touch targets
- Bottom navigation bar

---

### **15. ACCESSIBILITY FEATURES**

#### **Keyboard Navigation:**
- Tab navigation through all elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for form navigation

#### **Screen Reader Support:**
- ARIA labels on all interactive elements
- Alt text for images
- Semantic HTML structure
- Focus indicators

---

### **16. LOADING STATES**

#### **Page Loading:**
- Skeleton screens
- Progress indicators
- Loading spinners
- "Loading..." text

#### **Action Loading:**
- Button loading states
- Disabled form fields
- Loading overlays
- Progress bars

#### **Data Loading:**
- Placeholder content
- Shimmer effects
- Progressive loading
- Error states

This comprehensive UI/UX breakdown covers every page, button, and option in the system, ensuring a complete understanding of the user interface and experience. 