# How to Set Up Health Check Ping (Keep Render Service Alive)

## Why This is Important

Render's free plan spins down your service after 15 minutes of inactivity. This causes:
- **30-60 second delays** on the first request (cold start)
- **Slow performance** for users

Setting up a health check ping keeps your service "warm" and eliminates cold starts.

## Step-by-Step: UptimeRobot Setup

### Step 1: Create Account

1. Go to: **https://uptimerobot.com**
2. Click **"Sign Up"** (top right)
3. Enter your email and create a password
4. Verify your email (check your inbox)

### Step 2: Add Monitor

1. After logging in, you'll see the dashboard
2. Click the **"+ Add New Monitor"** button (big green button)

### Step 3: Configure Monitor

Fill in the form:

**Monitor Type:**
- Select: **HTTP(s)** (first option)

**Friendly Name:**
- Enter: `OnePlace Backend Health` (or any name you like)

**URL (or IP):**
- Enter: `https://oneplace-backend-0xjq.onrender.com/health`
- Make sure it's exactly this URL (no trailing slash)

**Monitoring Interval:**
- Select: **5 minutes** (minimum free tier)
- This will ping your backend every 5 minutes

**Alert Contacts:**
- You can skip this for now (or add your email if you want notifications)

### Step 4: Save

1. Click **"Create Monitor"** button
2. You should see a success message
3. The monitor will appear in your dashboard

### Step 5: Verify It's Working

1. Wait 1-2 minutes
2. Check your Render logs (Render Dashboard → Your Service → Logs)
3. You should see requests to `/health` every 5 minutes:
   ```
   GET /health 200
   ```

## Alternative: Cron-Job.org

If you prefer a different service:

### Step 1: Create Account
1. Go to: **https://cron-job.org**
2. Click **"Sign Up"** (free)
3. Verify your email

### Step 2: Create Cronjob
1. Click **"Create Cronjob"**
2. **Title:** `OnePlace Backend Health`
3. **Address:** `https://oneplace-backend-0xjq.onrender.com/health`
4. **Schedule:** Select **"Every 5 minutes"**
5. Click **"Create Cronjob"**

## Verify It's Working

### Check Render Logs:
1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service
3. Click **"Logs"** tab
4. You should see requests every 5 minutes:
   ```
   GET /health 200
   ```

### Test Performance:
1. Wait for the service to be pinged (check logs)
2. Try accessing your frontend
3. First request should be **much faster** (1-3 seconds instead of 30-60 seconds)

## Expected Results

**Before Setup:**
- First request: 30-60 seconds (cold start)
- Service spins down after 15 minutes

**After Setup:**
- First request: 1-3 seconds (service stays warm)
- Service never spins down (pinged every 5 minutes)

## Troubleshooting

### Monitor Not Working?
1. Check the URL is correct: `https://oneplace-backend-0xjq.onrender.com/health`
2. Make sure there's no trailing slash
3. Verify your Render service is running
4. Check UptimeRobot dashboard - monitor should show "Up" status

### Still Slow?
1. Wait a few minutes after setup (first ping might take time)
2. Check Render logs to confirm pings are happening
3. Clear browser cache
4. Try accessing the health endpoint directly: `https://oneplace-backend-0xjq.onrender.com/health`

## Free Tier Limits

**UptimeRobot Free:**
- 50 monitors
- 5-minute minimum interval
- Perfect for your use case!

**Cron-Job.org Free:**
- Unlimited cronjobs
- 1-minute minimum interval
- Also perfect for your use case!

## Summary

1. Sign up at UptimeRobot (or Cron-Job.org)
2. Create a monitor/cronjob
3. Set URL to: `https://oneplace-backend-0xjq.onrender.com/health`
4. Set interval to 5 minutes
5. Save and verify in Render logs

That's it! Your service will stay warm and perform much better.

