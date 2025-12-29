# Render Environment Variables Setup

## Required Environment Variables for Production

To ensure the backend properly connects with the frontend on Vercel, you need to set the following environment variable in your Render dashboard:

### Variable: `ALLOWED_ORIGINS`

**Value:** `https://one-place-frontend.vercel.app`

**Optional (for multiple origins):** If you have multiple frontend URLs, separate them with commas:
```
https://one-place-frontend.vercel.app,https://another-frontend.vercel.app
```

## How to Set in Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service: `oneplace-backend`
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Enter:
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** `https://one-place-frontend.vercel.app`
6. Click **Save Changes**
7. **Important:** Your service will automatically redeploy after saving

## Current Production URLs

- **Frontend:** https://one-place-frontend.vercel.app/
- **Backend:** https://oneplace-backend-0xjq.onrender.com

## How It Works

The backend CORS configuration:
- **Production:** Uses `ALLOWED_ORIGINS` environment variable if set, otherwise defaults to:
  - `https://one-place-frontend.vercel.app`
  - `https://*.vercel.app` (allows all Vercel preview deployments)
- **Development:** Allows localhost origins (5173, 5174, 3000)

## Verification

After setting the environment variable and redeploying:

1. Test CORS by making a request from the frontend
2. Check browser console for CORS errors
3. Verify API calls are working (try logging in)

## Troubleshooting

### Issue: CORS errors in browser console

**Solution:**
1. Verify `ALLOWED_ORIGINS` is set correctly in Render
2. Ensure the value matches exactly: `https://one-place-frontend.vercel.app`
3. Check that the service has been redeployed after setting the variable
4. Clear browser cache and try again

### Issue: Preview deployments not working

**Solution:** 
The backend automatically allows all `*.vercel.app` domains for preview deployments. If you need to restrict this, set `ALLOWED_ORIGINS` with specific URLs.

### Issue: Backend not accessible

**Solution:**
1. Check Render service status
2. Verify the backend URL is correct: `https://oneplace-backend-0xjq.onrender.com`
3. Test the health endpoint: `https://oneplace-backend-0xjq.onrender.com/health`

### Issue: 429 Rate Limit Errors

**Symptoms:** Getting "Too many requests" errors

**Solution:**
1. Rate limits are automatically higher in production (500 requests per 15 min)
2. If still hitting limits, you can increase via environment variables:
   - `RATE_LIMIT_MAX_REQUESTS` - Set to a higher value (e.g., 1000)
   - `RATE_LIMIT_AUTH_MAX` - Set to a higher value for login attempts (e.g., 20)
3. Wait 15 minutes for the rate limit window to reset
4. The rate limiter now properly handles proxy/load balancer IPs

## Additional Environment Variables

Make sure these are also set in Render:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Should be set to `production`
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Your Supabase service role key

### Optional Rate Limiting Variables:
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 500 in production, 100 in dev)
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_AUTH_MAX` - Max login attempts per window (default: 10 in production, 5 in dev)

**Note:** Rate limits are automatically increased in production to handle higher traffic. If you're still getting 429 errors, you can increase these values.

## Additional Environment Variables

Make sure these are also set in Render:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Should be set to `production`
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Your Supabase service role key
- Any other variables your application requires

