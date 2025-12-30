# Email Service Debugging Guide

## Current Error
```
❌ Email transporter not initialized
⚠️ Email service not configured, using fallback mode
❌ Failed to send report email: Email service not initialized
```

## What This Means
The email service cannot initialize because Gmail credentials are missing or incorrect in Render.

## How to Fix

### Step 1: Check Render Environment Variables

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service (`onePlace-backend`)
3. Go to the **"Environment"** tab
4. Check for these two variables:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`

### Step 2: Verify the Values

**GMAIL_USER should be:**
- Your Gmail address (e.g., `your-email@gmail.com`)
- No quotes, no spaces
- Example: `your-email@gmail.com` ✅
- Wrong: `"your-email@gmail.com"` ❌

**GMAIL_APP_PASSWORD should be:**
- A 16-character App Password (no spaces, no quotes)
- Example: `qnvstekzyiwcwhdg` ✅
- Wrong: `"qnvs tekz yiwc whdg"` ❌ (has spaces and quotes)
- Wrong: `qnvs tekz yiwc whdg` ❌ (has spaces)

### Step 3: Generate a New App Password (if needed)

If you don't have an App Password or it's not working:

1. Go to: https://myaccount.google.com
2. Click **Security** in the left menu
3. Under **"How you sign in to Google"**, click **2-Step Verification**
4. Scroll down and click **App Passwords**
5. Select **Mail** as the app
6. Select **Other (Custom name)** as the device
7. Enter a name like "OnePlace Backend"
8. Click **Generate**
9. Copy the 16-character password (it will show as "xxxx xxxx xxxx xxxx")
10. **Remove all spaces** - it should be exactly 16 characters
11. Paste it into Render's `GMAIL_APP_PASSWORD` variable (no spaces, no quotes)

### Step 4: Save and Redeploy

1. After setting/updating the environment variables in Render
2. Click **Save Changes**
3. Render will automatically redeploy your service
4. Wait for deployment to complete

### Step 5: Check Logs After Redeploy

After redeployment, check your Render logs. You should see:

**✅ If configured correctly:**
```
📧 Email service: Gmail credentials configured
✅ Email service ready - SMTP connection verified
📧 Gmail user: your-email@gmail.com
```

**❌ If still not working:**
```
⚠️ Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not set.
⚠️ Email service will operate in fallback mode (no emails sent).
```

## Common Issues

### Issue 1: App Password has spaces
**Solution:** Remove all spaces. The password should be exactly 16 characters with no spaces.

### Issue 2: Using regular Gmail password
**Solution:** You MUST use an App Password, not your regular Gmail password. App Passwords are required for SMTP.

### Issue 3: 2-Step Verification not enabled
**Solution:** You must enable 2-Step Verification on your Google Account before you can generate App Passwords.

### Issue 4: Quotes around values
**Solution:** Remove quotes from both `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Render.

## Testing

After fixing the credentials and redeploying:

1. Try sending a report from the Calendar page
2. Check Render logs for email sending status
3. You should see: `✅ Salesman report email sent successfully!`

## Still Not Working?

If you've verified all the above and it's still not working:

1. Check Render logs for the exact error message
2. Verify the App Password is correct (try generating a new one)
3. Make sure 2-Step Verification is enabled on your Google Account
4. Check that the Gmail account is not restricted or blocked

