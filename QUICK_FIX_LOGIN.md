# Quick Fix for 401 Login Error

## Immediate Steps to Diagnose

### 1. Check if Backend is Running

Test the backend health endpoint:
```bash
curl https://oneplace-backend-0xjq.onrender.com/health
```

**Expected:** Should return `{"status":"OK",...}`

### 2. Check Database Connection

Test database health:
```bash
curl https://oneplace-backend-0xjq.onrender.com/health/db
```

**Expected:** Should return `{"status":"OK","database":{"connected":true}}`

### 3. Verify User Exists in Database

The 401 error usually means:
- ❌ User doesn't exist
- ❌ Wrong password
- ❌ User account is inactive

**To check:**
1. Connect to your MongoDB database
2. Check if users exist:
```javascript
db.users.find({}, {email: 1, username: 1, role: 1, isActive: 1})
```

### 4. Check Backend Logs

1. Go to Render Dashboard
2. Select your backend service
3. Go to **Logs** tab
4. Look for:
   - `🔍 Login attempt:` - Shows what email/username was used
   - `❌ User not found:` - User doesn't exist
   - `❌ Account is inactive:` - User exists but is deactivated
   - `❌ Password mismatch:` - Wrong password
   - `✅ Login successful:` - Login worked

### 5. Verify Frontend Environment Variable

**In Vercel:**
- Variable: `VITE_API_URL`
- Value: `https://oneplace-backend-0xjq.onrender.com`
- **Must redeploy after setting!**

### 6. Test Login Directly

Test the API directly with curl:
```bash
curl -X POST https://oneplace-backend-0xjq.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://one-place-frontend.vercel.app" \
  -d '{"emailOrUsername":"your-email@example.com","password":"your-password"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "token": "...",
  "user": {...}
}
```

**Expected Response (401 Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

## Common Solutions

### Solution 1: User Doesn't Exist

**Problem:** No user in database with that email/username

**Fix:**
1. Create a user via registration endpoint
2. Or manually add user to database
3. Or use seed script if available

### Solution 2: Wrong Password

**Problem:** Password doesn't match

**Fix:**
1. Verify the password is correct
2. Check if password was hashed correctly
3. Try resetting password

### Solution 3: Account Inactive

**Problem:** User exists but `isActive: false`

**Fix:**
1. Update user in database:
```javascript
db.users.updateOne(
  {email: "user@example.com"},
  {$set: {isActive: true}}
)
```

### Solution 4: CORS Issue

**Problem:** Request blocked by CORS

**Check:**
1. Browser console for CORS errors
2. Backend logs for CORS warnings
3. Verify `ALLOWED_ORIGINS` in Render (optional)

**Fix:**
- Backend already configured to allow Vercel frontend
- If still having issues, check Render environment variables

### Solution 5: Backend Not Accessible

**Problem:** Backend service is sleeping or down

**Fix:**
1. Check Render service status
2. Free tier services sleep after inactivity
3. First request may take 30-60 seconds to wake up
4. Consider upgrading to prevent sleeping

## Next Steps

1. ✅ Check backend health endpoint
2. ✅ Check database connection
3. ✅ Check backend logs for detailed error
4. ✅ Verify user exists and is active
5. ✅ Test login with curl
6. ✅ Verify frontend environment variable is set

If all checks pass but login still fails, check the backend logs for the specific error message.

