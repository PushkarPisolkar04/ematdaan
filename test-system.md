# 🧪 E-Matdaan System Testing Guide

## 🚀 Quick Setup

### 1. Start the System
```bash
# Start Docker Desktop first
# Then start Supabase
npx supabase start

# Apply database migrations
npx supabase db reset

# Start development server
npm run dev
```

### 2. Access the Application
- **Frontend**: http://localhost:5173
- **Supabase Dashboard**: http://localhost:54323

## 🧪 Testing Scenarios

### **Scenario 1: Complete Organization Creation Flow**
1. **Open**: http://localhost:5173
2. **Click**: "Create Organization" button
3. **Fill Form**:
   - Organization: "Test University"
   - Owner Name: "John Doe"
   - Email: "john@testuniversity.com"
   - Password: "TestPass123!"
4. **Submit** and verify OTP email
5. **Expected**: Organization created, redirected to auth page

### **Scenario 2: Duplicate Organization Prevention**
1. **Try to create**: Another "Test University"
2. **Expected**: Error message about duplicate name

### **Scenario 3: Access Code System**
1. **Login as owner** of "Test University"
2. **Go to**: Admin Panel → Invitations tab
3. **Copy**: Voter access code
4. **Use navbar**: "Enter Access Code" button
5. **Enter**: The copied access code
6. **Register**: As a new voter
7. **Expected**: Voter can access dashboard

### **Scenario 4: Invitation System**
1. **In Admin Panel**: Create invitation token for admin role
2. **Copy**: Invitation link
3. **Open**: Link in incognito browser
4. **Register**: As admin
5. **Expected**: Admin can access admin panel

### **Scenario 5: Multi-Organization Test**
1. **Create**: Second organization "Test Company"
2. **Register**: Same email in both organizations
3. **Verify**: User can switch between organizations
4. **Expected**: Data isolation between organizations

## 🔍 Edge Cases to Test

### **Security Tests**
- [ ] Try accessing admin panel as voter
- [ ] Use expired invitation token
- [ ] Use already-used invitation token
- [ ] Enter wrong access code
- [ ] Try to create organization with existing slug

### **Validation Tests**
- [ ] Empty form submissions
- [ ] Invalid email formats
- [ ] Weak passwords
- [ ] Mismatched password confirmation
- [ ] Special characters in organization names

### **UI/UX Tests**
- [ ] Mobile responsiveness
- [ ] Modal positioning (access code vs organization creation)
- [ ] Navigation between pages
- [ ] Loading states
- [ ] Error message display

## 🐛 Common Issues & Solutions

### **Issue**: "Docker not running"
**Solution**: Start Docker Desktop first

### **Issue**: "Supabase connection failed"
**Solution**: Run `npx supabase start` and wait for all services

### **Issue**: "Database schema not updated"
**Solution**: Run `npx supabase db reset`

### **Issue**: "Modal not appearing in center"
**Solution**: Check z-index values in Navbar.tsx and Index.tsx

### **Issue**: "Create Organization button not working"
**Solution**: Verify URL parameter handling in Index.tsx

## 📊 Expected Database State After Testing

### **Tables Created**:
- `organizations` - Multi-tenant organizations
- `auth_users` - User accounts
- `user_organizations` - User-org relationships
- `access_tokens` - Invitation tokens
- `user_sessions` - Active sessions
- `audit_logs` - Security audit trail

### **Sample Data**:
```sql
-- Check organizations
SELECT * FROM organizations;

-- Check users
SELECT * FROM auth_users;

-- Check user-org relationships
SELECT * FROM user_organizations;

-- Check access tokens
SELECT * FROM access_tokens;
```

## ✅ Success Criteria

The system is working correctly if:

1. ✅ Organizations can be created with unique names
2. ✅ Access codes are generated and work for voter registration
3. ✅ Invitation tokens work for admin registration
4. ✅ Users can login/logout successfully
5. ✅ Multi-organization support works
6. ✅ Security controls prevent unauthorized access
7. ✅ UI/UX is smooth and responsive
8. ✅ All modals appear correctly positioned
9. ✅ Error handling works properly
10. ✅ Database stores all data correctly

## 🚨 If Tests Fail

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs**: `npx supabase logs`
3. **Reset database**: `npx supabase db reset`
4. **Restart services**: `npx supabase stop && npx supabase start`
5. **Clear browser cache** and try again

---

**Ready to test? Start with Scenario 1 and work through each test case!** 