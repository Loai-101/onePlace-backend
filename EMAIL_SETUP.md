# Email Service Setup Guide

## Overview
The application uses Gmail SMTP to send emails (company registration notifications, salesman reports, etc.).

## Required Environment Variables

You need to set these environment variables in your Render dashboard:

1. **GMAIL_USER** - Your Gmail address (e.g., `your-email@gmail.com`)
2. **GMAIL_APP_PASSWORD** - Gmail App Password (NOT your regular Gmail password)

## How to Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** as the app and **Other (Custom name)** as the device
5. Enter a name like "OnePlace PMS"
6. Click **Generate**
7. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
8. Use this password (without spaces) as your `GMAIL_APP_PASSWORD`

## Setting Environment Variables in Render

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add the following variables:
   - **Key**: `GMAIL_USER`
     **Value**: `your-email@gmail.com`
   - **Key**: `GMAIL_APP_PASSWORD`
     **Value**: `your-16-character-app-password` (no spaces)

## Testing Email Service

After setting the environment variables:
1. Restart your Render service
2. Check the Render logs - you should see:
   - `✅ Email service ready - SMTP connection verified` (if configured correctly)
   - `❌ Email service configuration error:` (if there's an issue)

## Troubleshooting

### Error: "EAUTH" or "535 Authentication failed"
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled on your Google account
- Check that the App Password was copied correctly (no spaces)

### Error: "Email service not configured"
- Verify both `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in Render
- Make sure there are no extra spaces in the environment variable values
- Restart the Render service after adding environment variables

### Error: "Connection timeout"
- Check your internet connection
- Verify Gmail SMTP is accessible (not blocked by firewall)

## Important Notes

- **Never commit Gmail credentials to Git**
- App Passwords are safer than regular passwords
- If you change your Gmail password, you'll need to generate a new App Password
- The email service will gracefully handle missing credentials (won't crash the app)

