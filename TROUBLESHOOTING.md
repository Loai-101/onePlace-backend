# Troubleshooting Guide

## 401 Error on Login

If you're getting a 401 error when trying to login, here are the possible causes and solutions:

### 1. Check User Credentials

**Symptoms:** 401 error with message "Invalid credentials"

**Possible Causes:**
- User doesn't exist in the database
- Wrong email/username
- Wrong password
- User account is inactive

**Solutions:**
1. Verify the user exists in the database
2. Check if the user account is active (`isActive: true`)
3. Try resetting the password
4. Check backend logs for detailed error messages

### 2. Check CORS Configuration

**Symptoms:** 401 error, but might actually be a CORS issue

**Solution:**
1. Check browser console for CORS errors
2. Verify `ALLOWED_ORIGINS` is set in Render (optional, has defaults)
3. Ensure frontend URL matches: `https://one-place-frontend.vercel.app`
4. Check backend logs for CORS warnings

### 3. Check Environment Variables

**Symptoms:** Various authentication errors

**Required Variables in Render:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Should be `production`
- `ALLOWED_ORIGINS` - Optional (defaults to Vercel URL)

**Solution:**
1. Go to Render Dashboard → Your Service → Environment
2. Verify all required variables are set
3. Redeploy the service after adding variables

### 4. Check Database Connection

**Symptoms:** 401 or 500 errors

**Solution:**
1. Test database connection: `https://oneplace-backend-0xjq.onrender.com/health/db`
2. Verify MongoDB URI is correct
3. Check if database is accessible from Render

### 5. Check Rate Limiting

**Symptoms:** 429 errors (Too Many Requests)

**Solution:**
- Wait 15 minutes before trying again
- Login endpoint has strict rate limiting (5 attempts per 15 minutes)

### 6. Verify Backend is Running

**Test Backend Health:**
```bash
curl https://oneplace-backend-0xjq.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "One Place API is running",
  "database": {
    "connected": true
  }
}
```

### 7. Check Frontend Environment Variable

**In Vercel:**
- Variable: `VITE_API_URL`
- Value: `https://oneplace-backend-0xjq.onrender.com`
- **Important:** Must redeploy after setting

### 8. Debug Steps

1. **Check Browser Console:**
   - Look for CORS errors
   - Check network tab for request/response details
   - Verify the request URL is correct

2. **Check Backend Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for error messages
   - Check for CORS warnings

3. **Test API Directly:**
   ```bash
   curl -X POST https://oneplace-backend-0xjq.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"emailOrUsername":"test@example.com","password":"password123"}'
   ```

4. **Verify Request Format:**
   - Email/Username field: `emailOrUsername`
   - Password field: `password`
   - Content-Type: `application/json`

## Common Issues

### Issue: "Invalid credentials" but user exists

**Possible Causes:**
- Password hash mismatch
- User account is inactive
- Database connection issues

**Solution:**
- Check user `isActive` status in database
- Verify password is correct
- Check backend logs for detailed errors

### Issue: CORS errors in browser

**Solution:**
1. Verify backend CORS configuration
2. Check `ALLOWED_ORIGINS` in Render
3. Ensure frontend URL is in allowed origins
4. Check backend logs for CORS warnings

### Issue: Backend not responding

**Solution:**
1. Check Render service status
2. Verify service is not sleeping (free tier)
3. Check service logs for errors
4. Test health endpoint

## Getting Help

If issues persist:
1. Check backend logs in Render Dashboard
2. Check browser console for errors
3. Verify all environment variables are set
4. Test backend health endpoint
5. Verify database connection

