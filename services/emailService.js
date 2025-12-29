// Email service using Nodemailer with Gmail SMTP
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    // Check if Gmail credentials are provided
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailPassword || gmailPassword === 'your-app-password-here') {
      console.warn('⚠️ Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not set.');
      console.warn('⚠️ Email service will operate in fallback mode (no emails sent).');
      console.warn('📧 To enable email sending, set GMAIL_USER and GMAIL_APP_PASSWORD in Render environment variables.');
      console.warn('📧 Refer to EMAIL_SETUP.md for instructions on generating a Gmail App Password.');
      this.transporter = null; // Disable transporter if not configured
      return;
    }
    
    // Create transporter for Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });
    
    // Verify transporter configuration
    this.verifyConnection();
  }
  
  async verifyConnection() {
    if (!this.transporter) {
      console.log('⚠️ Email service not initialized - Gmail credentials missing');
      return;
    }
    
    try {
      await this.transporter.verify();
      console.log('✅ Email service ready - SMTP connection verified');
      console.log('📧 Gmail user:', process.env.GMAIL_USER);
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('   Authentication failed. Please check GMAIL_USER and GMAIL_APP_PASSWORD.');
        console.error('   Ensure App Password is correct (not your regular Gmail password).');
        console.error('   Refer to EMAIL_SETUP.md for instructions on generating an App Password.');
      }
      console.log('📧 Please check your Gmail credentials and App Password');
      this.transporter = null; // Disable transporter on verification failure
    }
  }

  loadEmailStyles() {
    try {
      const cssPath = path.join(__dirname, 'emailStyles.css');
      return fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
      console.error('❌ Error loading email styles:', error.message);
      return '/* Fallback styles */ body { font-family: Arial, sans-serif; }';
    }
  }

  async sendCompanyRegistrationEmail(registrationData) {
    const {
      companyName,
      companyEmail,
      companyPhone,
      ibanNumber,
      bankName,
      vatNumber,
      crNumber,
      companyType,
      dueDate,
      companySize,
      businessTarget,
      numberOfUsers,
      companyAddress,
      companyCity,
      companyCountry,
      postalCode,
      ownerName,
      ownerEmail,
      ownerUsername
    } = registrationData;

    // Format data for better readability
    const formatCompanyType = (type) => {
      const types = {
        'llc': 'Limited Liability Company (LLC)',
        'corporation': 'Corporation',
        'partnership': 'Partnership',
        'sole-proprietorship': 'Sole Proprietorship',
        'non-profit': 'Non-Profit Organization',
        'other': 'Other'
      };
      return types[type] || type;
    };

    const formatCompanySize = (size) => {
      const sizes = {
        'startup': 'Startup (1-10 employees)',
        'small': 'Small (11-50 employees)',
        'medium': 'Medium (51-200 employees)',
        'large': 'Large (201-500 employees)',
        'enterprise': 'Enterprise (500+ employees)'
      };
      return sizes[size] || size;
    };

    const formatBusinessTarget = (target) => {
      const targets = {
        'medical-items': 'Medical Items Sales',
        'pharmacy': 'Pharmacy',
        'collecting-orders': 'Collecting Orders',
        'other': 'Other'
      };
      return targets[target] || target;
    };

    // Load external CSS styles
    const emailStyles = this.loadEmailStyles();

    // Create HTML email template with external styling
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Company Registration - ${companyName}</title>
        <style>
            ${emailStyles}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="header-content">
                <h1>🏢 New Company Registration</h1>
                    <div class="company-name">${companyName}</div>
                </div>
            </div>
            
            <div class="content">
                <div style="text-align: center;">
                    <div class="status-badge">Pending Approval</div>
                </div>

                <div class="section">
                    <h3>📋 Company Information</h3>
                    <div class="field">
                        <strong>Company Name:</strong>
                        <span class="field-value">${companyName}</span>
                    </div>
                    <div class="field">
                        <strong>Company Email:</strong>
                        <span class="field-value">${companyEmail}</span>
                    </div>
                    <div class="field">
                        <strong>Company Phone:</strong>
                        <span class="field-value">${companyPhone}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>🏦 Banking Information</h3>
                    <div class="field">
                        <strong>IBAN Number:</strong>
                        <span class="field-value">${ibanNumber}</span>
                    </div>
                    <div class="field">
                        <strong>Bank Name:</strong>
                        <span class="field-value">${bankName}</span>
                    </div>
                    <div class="field">
                        <strong>VAT Number:</strong>
                        <span class="field-value">${vatNumber}</span>
                    </div>
                    <div class="field">
                        <strong>CR Number:</strong>
                        <span class="field-value">${crNumber}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>🏢 Company Details</h3>
                    <div class="field">
                        <strong>Company Type:</strong>
                        <span class="field-value">${formatCompanyType(companyType)}</span>
                    </div>
                    <div class="field">
                        <strong>Due Date:</strong>
                        <span class="field-value">${new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                    <div class="field">
                        <strong>Company Size:</strong>
                        <span class="field-value">${formatCompanySize(companySize)}</span>
                    </div>
                    <div class="field">
                        <strong>Business Target:</strong>
                        <span class="field-value">${formatBusinessTarget(businessTarget)}</span>
                    </div>
                    <div class="field">
                        <strong>Number of Users:</strong>
                        <span class="field-value">${numberOfUsers}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>📍 Address Information</h3>
                    <div class="field">
                        <strong>Street Address:</strong>
                        <span class="field-value">${companyAddress}</span>
                    </div>
                    <div class="field">
                        <strong>City:</strong>
                        <span class="field-value">${companyCity}</span>
                    </div>
                    <div class="field">
                        <strong>Country:</strong>
                        <span class="field-value">${companyCountry}</span>
                    </div>
                    <div class="field">
                        <strong>Postal Code:</strong>
                        <span class="field-value">${postalCode}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>👤 Owner Information</h3>
                    <div class="field">
                        <strong>Owner Name:</strong>
                        <span class="field-value">${ownerName}</span>
                    </div>
                    <div class="field">
                        <strong>Owner Email:</strong>
                        <span class="field-value">${ownerEmail}</span>
                    </div>
                    <div class="field">
                        <strong>Owner Username:</strong>
                        <span class="field-value">${ownerUsername}</span>
                    </div>
                </div>

                <div class="highlight">
                    <h4 style="color: #2d3748; margin-bottom: 10px;">📝 Registration Summary</h4>
                    <p style="color: #4a5568; margin: 0;">A new company has registered and is awaiting approval. Please review the information above and take appropriate action.</p>
                </div>
            </div>

            <div class="footer">
                <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
                <p>This is an automated notification from the Company Registration System.</p>
                <div class="timestamp">System Generated</div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create plain text version
    const textTemplate = `
NEW COMPANY REGISTRATION

Company Information:
===================
Company Name: ${companyName}
Company Email: ${companyEmail}
Company Phone: ${companyPhone}

Banking Information:
==================
IBAN Number: ${ibanNumber}
Bank Name: ${bankName}
VAT Number: ${vatNumber}
CR Number: ${crNumber}

Company Details:
===============
Company Type: ${formatCompanyType(companyType)}
Due Date: ${new Date(dueDate).toLocaleDateString()}
Company Size: ${formatCompanySize(companySize)}
Business Target: ${formatBusinessTarget(businessTarget)}
Number of Users: ${numberOfUsers}

Address Information:
==================
Street Address: ${companyAddress}
City: ${companyCity}
Country: ${companyCountry}
Postal Code: ${postalCode}

Owner Information:
=================
Owner Name: ${ownerName}
Owner Email: ${ownerEmail}
Owner Username: ${ownerUsername}

Registration Date: ${new Date().toLocaleString()}
Status: Pending Approval

Please review and approve this company registration.
    `.trim();

    // Send email using Nodemailer
    const mailOptions = {
      from: '"Company Registration System" <q9g8moh@gmail.com>',
      to: 'q9g8moh@gmail.com',
      subject: `New Company Registration: ${companyName}`,
      text: textTemplate,
      html: htmlTemplate,
      replyTo: companyEmail
    };

    try {
      console.log('📧 Sending email with Nodemailer...');
      console.log('📧 Email options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        replyTo: mailOptions.replyTo
      });
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Response:', info.response);
      
      return { success: true, message: 'Email sent successfully', messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending error:', error);
      
      // Fallback: Log the email content to console for manual sending
      console.log('📧 FALLBACK: Email content for manual sending:');
      console.log('📧 To: q9g8moh@gmail.com');
      console.log('📧 Subject:', mailOptions.subject);
      console.log('📧 Content:');
      console.log(mailOptions.text);
      
      // Don't throw error, just log it
      return { 
        success: false, 
        message: 'Email service not configured. Check console for email content.',
        fallback: true,
        emailContent: {
          to: 'q9g8moh@gmail.com',
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html
        }
      };
    }
  }

  async sendCompanyApprovalEmail(companyData) {
    const {
      companyName,
      companyEmail,
      ownerName,
      ownerEmail,
      ownerUsername
    } = companyData;

    // Load external CSS styles
    const emailStyles = this.loadEmailStyles();

    // Create HTML email template for approval
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Company Registration Approved - ${companyName}</title>
        <style>
            ${emailStyles}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                <div class="header-content">
                    <h1>✅ Company Registration Approved</h1>
                    <div class="company-name">${companyName}</div>
                </div>
            </div>
            
            <div class="content">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div class="status-badge" style="background: #48bb78; color: white; font-size: 18px; padding: 12px 24px;">
                        🎉 APPROVED
                    </div>
                </div>

                <div class="section">
                    <h3>🎊 Congratulations!</h3>
                    <p style="font-size: 16px; line-height: 1.6; color: #2d3748;">
                        We are pleased to inform you that your company registration for <strong>${companyName}</strong> has been <strong>approved</strong>!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
                        Your account is now active and you can start using our platform to manage your business operations.
                    </p>
                </div>

                <div class="section">
                    <h3>📋 Account Information</h3>
                    <div class="field">
                        <strong>Company Name:</strong>
                        <span class="field-value">${companyName}</span>
                    </div>
                    <div class="field">
                        <strong>Owner Name:</strong>
                        <span class="field-value">${ownerName}</span>
                    </div>
                    <div class="field">
                        <strong>Username:</strong>
                        <span class="field-value">${ownerUsername}</span>
                    </div>
                    <div class="field">
                        <strong>Email:</strong>
                        <span class="field-value">${ownerEmail}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>🚀 Next Steps</h3>
                    <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin: 15px 0;">
                        <ol style="margin: 0; padding-left: 20px; color: #2d3748;">
                            <li style="margin-bottom: 8px;">Log in to your account using your username and password</li>
                            <li style="margin-bottom: 8px;">Complete your company profile setup</li>
                            <li style="margin-bottom: 8px;">Explore the platform features and tools</li>
                            <li style="margin-bottom: 8px;">Start managing your business operations</li>
                        </ol>
                    </div>
                </div>

                <div class="highlight" style="background: #e6fffa; border: 1px solid #38b2ac;">
                    <h4 style="color: #2d3748; margin-bottom: 10px;">💡 Need Help?</h4>
                    <p style="color: #4a5568; margin: 0;">
                        If you have any questions or need assistance getting started, please don't hesitate to contact our support team.
                    </p>
                </div>
            </div>

            <div class="footer">
                <p><strong>Approval Date:</strong> ${new Date().toLocaleString()}</p>
                <p>Welcome to our platform! We look forward to supporting your business growth.</p>
                <div class="timestamp">System Generated</div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create plain text version
    const textTemplate = `
COMPANY REGISTRATION APPROVED

Congratulations!

We are pleased to inform you that your company registration for ${companyName} has been APPROVED!

Your account is now active and you can start using our platform to manage your business operations.

Account Information:
===================
Company Name: ${companyName}
Owner Name: ${ownerName}
Username: ${ownerUsername}
Email: ${ownerEmail}

Next Steps:
===========
1. Log in to your account using your username and password
2. Complete your company profile setup
3. Explore the platform features and tools
4. Start managing your business operations

Need Help?
==========
If you have any questions or need assistance getting started, please don't hesitate to contact our support team.

Approval Date: ${new Date().toLocaleString()}
Welcome to our platform! We look forward to supporting your business growth.
    `.trim();

    // Send email using Nodemailer
    const mailOptions = {
      from: '"Company Registration System" <q9g8moh@gmail.com>',
      to: companyEmail,
      subject: `✅ Company Registration Approved - ${companyName}`,
      text: textTemplate,
      html: htmlTemplate,
      replyTo: 'q9g8moh@gmail.com'
    };

    try {
      console.log('📧 Sending approval email...');
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Approval email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      
      return { success: true, message: 'Approval email sent successfully', messageId: info.messageId };
    } catch (error) {
      console.error('❌ Approval email sending error:', error);
      
      // Fallback: Log the email content
      console.log('📧 FALLBACK: Approval email content for manual sending:');
      console.log('📧 To:', companyEmail);
      console.log('📧 Subject:', mailOptions.subject);
      console.log('📧 Content:');
      console.log(mailOptions.text);
      
      return { 
        success: false, 
        message: 'Approval email service not configured. Check console for email content.',
        fallback: true,
        emailContent: {
          to: companyEmail,
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html
        }
      };
    }
  }

  async sendCompanyRejectionEmail(companyData, rejectionReason = '') {
    const {
      companyName,
      companyEmail,
      ownerName,
      ownerEmail,
      ownerUsername
    } = companyData;

    // Load external CSS styles
    const emailStyles = this.loadEmailStyles();

    // Create HTML email template for rejection
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Company Registration Update - ${companyName}</title>
        <style>
            ${emailStyles}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);">
                <div class="header-content">
                    <h1>❌ Company Registration Update</h1>
                    <div class="company-name">${companyName}</div>
                </div>
            </div>
            
            <div class="content">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div class="status-badge" style="background: #e53e3e; color: white; font-size: 18px; padding: 12px 24px;">
                        ⚠️ NOT APPROVED
                    </div>
                </div>

                <div class="section">
                    <h3>📋 Registration Status Update</h3>
                    <p style="font-size: 16px; line-height: 1.6; color: #2d3748;">
                        We regret to inform you that your company registration for <strong>${companyName}</strong> has not been approved at this time.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
                        After careful review of your application, we were unable to approve your registration based on our current criteria.
                    </p>
                </div>

                ${rejectionReason ? `
                <div class="section">
                    <h3>📝 Reason for Rejection</h3>
                    <div style="background: #fed7d7; border-left: 4px solid #e53e3e; padding: 15px; margin: 15px 0;">
                        <p style="margin: 0; color: #2d3748; font-style: italic;">
                            "${rejectionReason}"
                        </p>
                    </div>
                </div>
                ` : ''}

                <div class="section">
                    <h3>📋 Application Information</h3>
                    <div class="field">
                        <strong>Company Name:</strong>
                        <span class="field-value">${companyName}</span>
                    </div>
                    <div class="field">
                        <strong>Owner Name:</strong>
                        <span class="field-value">${ownerName}</span>
                    </div>
                    <div class="field">
                        <strong>Username:</strong>
                        <span class="field-value">${ownerUsername}</span>
                    </div>
                    <div class="field">
                        <strong>Email:</strong>
                        <span class="field-value">${ownerEmail}</span>
                    </div>
                </div>

                <div class="section">
                    <h3>🔄 What's Next?</h3>
                    <div style="background: #fef5e7; border-left: 4px solid #ed8936; padding: 15px; margin: 15px 0;">
                        <ul style="margin: 0; padding-left: 20px; color: #2d3748;">
                            <li style="margin-bottom: 8px;">Review the information provided in your application</li>
                            <li style="margin-bottom: 8px;">Address any issues or missing information</li>
                            <li style="margin-bottom: 8px;">You may reapply with updated information</li>
                            <li style="margin-bottom: 8px;">Contact our support team if you have questions</li>
                        </ul>
                    </div>
                </div>

                <div class="highlight" style="background: #e6fffa; border: 1px solid #38b2ac;">
                    <h4 style="color: #2d3748; margin-bottom: 10px;">💬 Need Assistance?</h4>
                    <p style="color: #4a5568; margin: 0;">
                        If you have questions about this decision or need help with your application, please contact our support team. We're here to help you succeed.
                    </p>
                </div>
            </div>

            <div class="footer">
                <p><strong>Decision Date:</strong> ${new Date().toLocaleString()}</p>
                <p>Thank you for your interest in our platform. We encourage you to reapply when you're ready.</p>
                <div class="timestamp">System Generated</div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create plain text version
    const textTemplate = `
COMPANY REGISTRATION UPDATE

Registration Status Update

We regret to inform you that your company registration for ${companyName} has not been approved at this time.

After careful review of your application, we were unable to approve your registration based on our current criteria.

${rejectionReason ? `Reason for Rejection: "${rejectionReason}"` : ''}

Application Information:
=======================
Company Name: ${companyName}
Owner Name: ${ownerName}
Username: ${ownerUsername}
Email: ${ownerEmail}

What's Next?
============
1. Review the information provided in your application
2. Address any issues or missing information
3. You may reapply with updated information
4. Contact our support team if you have questions

Need Assistance?
================
If you have questions about this decision or need help with your application, please contact our support team. We're here to help you succeed.

Decision Date: ${new Date().toLocaleString()}
Thank you for your interest in our platform. We encourage you to reapply when you're ready.
    `.trim();

    // Send email using Nodemailer
    const mailOptions = {
      from: '"Company Registration System" <q9g8moh@gmail.com>',
      to: companyEmail,
      subject: `❌ Company Registration Update - ${companyName}`,
      text: textTemplate,
      html: htmlTemplate,
      replyTo: 'q9g8moh@gmail.com'
    };

    try {
      console.log('📧 Sending rejection email...');
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Rejection email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      
      return { success: true, message: 'Rejection email sent successfully', messageId: info.messageId };
    } catch (error) {
      console.error('❌ Rejection email sending error:', error);
      
      // Fallback: Log the email content
      console.log('📧 FALLBACK: Rejection email content for manual sending:');
      console.log('📧 To:', companyEmail);
      console.log('📧 Subject:', mailOptions.subject);
      console.log('📧 Content:');
      console.log(mailOptions.text);
      
      return { 
        success: false, 
        message: 'Rejection email service not configured. Check console for email content.',
        fallback: true,
        emailContent: {
          to: companyEmail,
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html
        }
      };
    }
  }

  /**
   * Send user credentials email
   */
  async sendUserCredentialsEmail({ userName, userEmail, username, password, companyName, role }) {
    try {
      const mailOptions = {
        from: `"${companyName}" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject: `Welcome to ${companyName} - Your Login Credentials`,
        text: `Hello ${userName},\n\nYour account has been created for ${companyName}.\n\nUsername: ${username}\nPassword: ${password}\nRole: ${role}\n\nPlease login and change your password.\n\nBest regards,\n${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .credentials-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
              .credential-item { margin: 10px 0; }
              .credential-label { font-weight: bold; color: #667eea; }
              .credential-value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; display: inline-block; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to ${companyName}!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Your account has been created successfully. Below are your login credentials:</p>
                
                <div class="credentials-box">
                  <div class="credential-item">
                    <span class="credential-label">Username:</span>
                    <span class="credential-value">${username}</span>
                  </div>
                  <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">${password}</span>
                  </div>
                  <div class="credential-item">
                    <span class="credential-label">Role:</span>
                    <span class="credential-value">${role}</span>
                  </div>
                </div>

                <div class="warning">
                  <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                </div>

                <p>You can now login to your account and start working.</p>
                <p>If you have any questions, please contact your administrator.</p>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      if (this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
      } else {
        console.log('📧 Email Preview (Credentials Email):');
        console.log('To:', userEmail);
        console.log('Subject:', mailOptions.subject);
        console.log('Username:', username);
        console.log('Password:', password);
        return { success: false, message: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Email Error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ userName, userEmail, newPassword, companyName }) {
    try {
      const mailOptions = {
        from: `"${companyName}" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject: `Password Reset - ${companyName}`,
        text: `Hello ${userName},\n\nYour password has been reset by your administrator.\n\nNew Password: ${newPassword}\n\nPlease login and change your password immediately.\n\nBest regards,\n${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .password-box { background: white; border-left: 4px solid #f5576c; padding: 20px; margin: 20px 0; text-align: center; }
              .password-value { font-family: monospace; font-size: 24px; background: #f0f0f0; padding: 15px 25px; border-radius: 4px; display: inline-block; letter-spacing: 2px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Your password has been reset by your administrator.</p>
                
                <div class="password-box">
                  <p style="margin: 0 0 10px 0; color: #f5576c; font-weight: bold;">Your New Password:</p>
                  <div class="password-value">${newPassword}</div>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> Please login immediately and change this password to something only you know.
                </div>

                <p>For security reasons, we recommend choosing a strong password that includes:</p>
                <ul>
                  <li>At least 8 characters</li>
                  <li>Mix of uppercase and lowercase letters</li>
                  <li>Numbers and special characters</li>
                </ul>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      if (this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
      } else {
        console.log('📧 Email Preview (Password Reset Email):');
        console.log('To:', userEmail);
        console.log('Subject:', mailOptions.subject);
        console.log('New Password:', newPassword);
        return { success: false, message: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Email Error:', error);
      return { success: false, message: error.message };
    }
  }

  async sendSalesmanReport({ salesmanName, salesmanEmail, companyName, companyEmail, reportTitle, reportContent, reportDate }) {
    try {
      // Validate required parameters
      if (!companyEmail) {
        console.error('❌ Company email is missing');
        return { success: false, message: 'Company email is required' };
      }

      // Check if email service is configured
      const gmailUser = process.env.GMAIL_USER;
      const gmailPassword = process.env.GMAIL_APP_PASSWORD;
      
      if (!gmailUser || !gmailPassword || gmailPassword === 'your-app-password-here') {
        console.log('⚠️ Email service not configured - Gmail credentials missing');
        return { success: false, message: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.', fallback: true };
      }

      // Check if transporter is available
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized');
        return { success: false, message: 'Email service not initialized', fallback: true };
      }

      const mailOptions = {
        from: `"${salesmanName}" <${gmailUser}>`,
        to: companyEmail,
        subject: `Sales Report from ${salesmanName} - ${reportTitle}`,
        replyTo: salesmanEmail,
        text: `Sales Report from ${salesmanName}\n\nDate: ${reportDate}\n\nTitle: ${reportTitle}\n\nReport:\n${reportContent}\n\n---\nThis report was sent from the OnePlace PMS system.\nSalesman: ${salesmanName} (${salesmanEmail})`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 700px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .report-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 4px; }
              .report-content { background: white; padding: 25px; margin: 20px 0; border-radius: 4px; white-space: pre-wrap; line-height: 1.8; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
              .label { font-weight: bold; color: #667eea; margin-right: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Sales Report</h1>
                <p style="margin: 10px 0 0 0; font-size: 1.1em;">From: ${salesmanName}</p>
              </div>
              <div class="content">
                <div class="report-info">
                  <p><span class="label">Date:</span> ${reportDate}</p>
                  <p><span class="label">Title:</span> ${reportTitle}</p>
                  <p><span class="label">Salesman:</span> ${salesmanName}</p>
                  <p><span class="label">Email:</span> ${salesmanEmail}</p>
                </div>
                
                <div class="report-content">
                  <h3 style="margin-top: 0; color: #667eea;">Report Content:</h3>
                  ${reportContent.replace(/\n/g, '<br>')}
                </div>
                
                <div class="footer">
                  <p>This report was sent from the OnePlace PMS system.</p>
                  <p>You can reply directly to this email to contact ${salesmanName}.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      // Attempt to send email
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('✅ Salesman report email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Sent to:', companyEmail);
        return { success: true, messageId: info.messageId };
      } catch (sendError) {
        console.error('❌ Error sending email:', sendError);
        console.error('Error details:', {
          code: sendError.code,
          command: sendError.command,
          response: sendError.response,
          message: sendError.message
        });
        
        // Check for specific Gmail authentication errors
        if (sendError.code === 'EAUTH' || sendError.responseCode === 535) {
          return { 
            success: false, 
            message: 'Gmail authentication failed. Please check GMAIL_USER and GMAIL_APP_PASSWORD environment variables.',
            fallback: true 
          };
        }
        
        return { 
          success: false, 
          message: `Failed to send email: ${sendError.message || 'Unknown error'}` 
        };
      }
    } catch (error) {
      console.error('❌ Email service error:', error);
      console.error('Error stack:', error.stack);
      return { 
        success: false, 
        message: error.message || 'Unknown error occurred while sending email' 
      };
    }
  }
}

module.exports = new EmailService();
