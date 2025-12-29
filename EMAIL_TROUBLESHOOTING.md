# Email Service Troubleshooting Guide

## Current Status Check

Based on your Render terminal output, the server is running successfully. However, I don't see any email service initialization messages, which suggests the email service might not be properly configured.

## What to Check

### 1. Environment Variables in Render

Make sure these environment variables are set in your Render dashboard:

- **GMAIL_USER**: Your Gmail address (e.g., `your-email@gmail.com`)
- **GMAIL_APP_PASSWORD**: Your Gmail App Password (NOT your regular Gmail password)

**To set them:**
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add/Edit the environment variables
5. Save and redeploy

### 2. Check Server Logs

After the next deployment, look for these messages in your Render logs:

**✅ If email service is configured:**
```
📧 Email service: Gmail credentials configured
✅ Email service ready - SMTP connection verified
📧 Gmail user: your-email@gmail.com
```

**⚠️ If email service is NOT configured:**
```
⚠️  Email service: Gmail credentials NOT configured
⚠️  Email sending will be disabled. Set GMAIL_USER and GMAIL_APP_PASSWORD in Render.
📧 Refer to EMAIL_SETUP.md for setup instructions
```

### 3. Gmail App Password Setup

If you haven't set up a Gmail App Password yet:

1. Go to your Google Account settings
2. Enable 2-Step Verification (required for App Passwords)
3. Go to "App Passwords" section
4. Generate a new App Password for "Mail"
5. Copy the 16-character password (without spaces)
6. Use this as your `GMAIL_APP_PASSWORD` in Render

**Important:** 
- Use the App Password, NOT your regular Gmail password
- The App Password should be 16 characters (no spaces)
- See `EMAIL_SETUP.md` for detailed instructions

### 4. Test Email Sending

After setting up the credentials:

1. Deploy the backend (Render will auto-deploy after you save environment variables)
2. Check the logs for email service initialization messages
3. Try sending a report from the calendar page
4. Check the logs for email sending status

## Common Issues

### Issue 1: "Email service not configured"
**Solution:** Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in Render environment variables

### Issue 2: "Authentication failed" (EAUTH error)
**Solution:** 
- Make sure you're using an App Password, not your regular Gmail password
- Verify the App Password is correct (no spaces, all 16 characters)
- Regenerate the App Password if needed

### Issue 3: "Company email not found"
**Solution:** Make sure the company has an email address set in the database

### Issue 4: Emails not sending but no errors
**Solution:** Check Render logs for email service initialization messages. The service might be in fallback mode.

## What Was Fixed

1. **Email Service Initialization**: Now checks for credentials before creating transporter
2. **Better Error Handling**: More specific error messages for authentication failures
3. **Startup Logging**: Server now logs email service status on startup
4. **Fallback Mode**: If credentials are missing, service operates in fallback mode (no emails sent, but no errors)

## Next Steps

1. **Set Environment Variables in Render:**
   - `GMAIL_USER`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: Your Gmail App Password

2. **Redeploy the Backend:**
   - Render will automatically redeploy when you save environment variables
   - Or manually trigger a redeploy

3. **Check Logs:**
   - Look for email service initialization messages
   - Verify SMTP connection is verified

4. **Test Email Sending:**
   - Try sending a report from the calendar page
   - Check logs for success/error messages

## Terminal Warnings (Not Critical)

The warnings you see in the terminal are **NOT** blocking email sending:

- `Duplicate schema index` - Just a performance warning, doesn't affect functionality
- `useNewUrlParser is deprecated` - MongoDB driver warning, doesn't affect functionality
- `useUnifiedTopology is deprecated` - MongoDB driver warning, doesn't affect functionality

These are just warnings and won't prevent email sending.

## Need Help?

If emails still don't send after setting up credentials:

1. Check Render logs for email service messages
2. Verify Gmail App Password is correct
3. Make sure 2-Step Verification is enabled on your Google Account
4. Check that company email addresses are set in the database

