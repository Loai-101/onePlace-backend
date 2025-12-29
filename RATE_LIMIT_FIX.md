# Rate Limit (429 Error) Fix

## Problem
Getting 429 "Too Many Requests" errors when making API calls.

## Solution Applied

### 1. Increased Rate Limits for Production
- **General API requests**: Increased from 100 to **500 requests per 15 minutes** in production
- **Login attempts**: Increased from 5 to **10 attempts per 15 minutes** in production
- These limits are automatically applied when `NODE_ENV=production`

### 2. Better IP Detection
- Added custom key generator to properly detect real client IPs
- Handles proxy/load balancer scenarios (like Render's infrastructure)
- Checks `x-forwarded-for` and `x-real-ip` headers

### 3. Configurable via Environment Variables
You can customize rate limits in Render by setting:
- `RATE_LIMIT_MAX_REQUESTS` - General API requests (default: 500 in production)
- `RATE_LIMIT_AUTH_MAX` - Login attempts (default: 10 in production)
- `RATE_LIMIT_WINDOW_MS` - Time window (default: 900000 = 15 minutes)

## Current Limits

### Production (NODE_ENV=production):
- General API: **500 requests per 15 minutes**
- Login attempts: **10 attempts per 15 minutes**

### Development:
- General API: **100 requests per 15 minutes**
- Login attempts: **5 attempts per 15 minutes**

## If You Still Get 429 Errors

1. **Wait 15 minutes** - The rate limit window will reset
2. **Increase limits in Render**:
   - Go to Render Dashboard → Your Service → Environment
   - Add: `RATE_LIMIT_MAX_REQUESTS` = `1000` (or higher)
   - Add: `RATE_LIMIT_AUTH_MAX` = `20` (or higher)
   - Redeploy the service

3. **Check your usage**:
   - Are you making too many requests in a short time?
   - Is the frontend making multiple parallel requests?
   - Consider implementing request batching or caching

## Testing

After deploying, test the backend:
```bash
# Should return 200 OK
curl https://oneplace-backend-0xjq.onrender.com/health

# Make multiple requests to test rate limiting
for i in {1..10}; do curl https://oneplace-backend-0xjq.onrender.com/health; done
```

## Next Steps

1. **Deploy the updated backend** to Render
2. **Monitor rate limit errors** in Render logs
3. **Adjust limits** if needed via environment variables

