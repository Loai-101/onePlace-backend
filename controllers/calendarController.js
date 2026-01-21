const Calendar = require('../models/Calendar');
const Account = require('../models/Account');
const Company = require('../models/Company');
const emailService = require('../services/emailService');
const { 
  validateCompanyOwnership, 
  buildCompanyQuery 
} = require('../middleware/companyIsolation');

// @desc    Get all calendar events
// @route   GET /api/calendar
// @access  Private
const getCalendarEvents = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status,
      account,
      salesman // Filter by salesman ID (for owner/admin)
    } = req.query;

    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Build company-scoped query - CRITICAL for data isolation
    let query = buildCompanyQuery({}, companyId);

    // Filter by createdBy (salesman)
    if (req.user.role === 'salesman') {
      query.createdBy = req.user._id;
    } else if (salesman) {
      // Owner/admin can filter by specific salesman
      query.createdBy = salesman;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Account filter
    if (account) {
      query.account = account;
    }

    // Execute query
    const events = await Calendar.find(query)
      .populate('account', 'name phone email')
      .populate('createdBy', 'name email')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar events'
    });
  }
};

// @desc    Get single calendar event
// @route   GET /api/calendar/:id
// @access  Private
const getCalendarEvent = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const event = await Calendar.findOne({
      _id: req.params.id,
      company: companyId
    })
      .populate('account', 'name phone email address')
      .populate('createdBy', 'name email')
      .populate('company', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(event, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This event belongs to a different company.'
      });
    }

    // Check company access
    if (event.company) {
      let companyId;
      if (typeof event.company === 'object' && event.company._id) {
        companyId = event.company._id.toString();
      } else {
        companyId = event.company.toString();
      }
      
      const userCompanyId = req.user.company?.toString();
      if (companyId !== userCompanyId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this event'
        });
      }
    }

    // Check permissions for salesmen - they can only access their own events
    if (req.user.role === 'salesman') {
      // Handle both populated and non-populated createdBy
      let createdById;
      if (event.createdBy) {
        if (typeof event.createdBy === 'object' && event.createdBy._id) {
          createdById = event.createdBy._id.toString();
        } else {
          createdById = event.createdBy.toString();
        }
      }
      
      const userId = req.user._id.toString();
      
      if (!createdById || createdById !== userId) {
        console.log('Access denied for salesman:', {
          eventId: event._id,
          createdById,
          userId,
          createdByType: typeof event.createdBy,
          createdByValue: event.createdBy
        });
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this event'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get calendar event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar event'
    });
  }
};

// @desc    Create calendar event
// @route   POST /api/calendar
// @access  Private
const createCalendarEvent = async (req, res) => {
  try {
    const {
      title,
      type,
      date,
      startTime,
      endTime,
      account,
      accountName: providedAccountName,
      description
    } = req.body;

    // Validate required fields
    if (!title || !type || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and date are required'
      });
    }

    // Validate type
    if (!['visit', 'todo'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "visit" or "todo"'
      });
    }

    // For visits, either account or accountName (for "other") is required
    if (type === 'visit' && !account && !providedAccountName) {
      return res.status(400).json({
        success: false,
        message: 'Account or account name is required for visit events'
      });
    }

    // Get account name if visit
    let accountName = null;
    if (type === 'visit') {
      if (account && account !== 'other') {
        // Regular account from database
        const accountDoc = await Account.findById(account);
        if (!accountDoc) {
          return res.status(404).json({
            success: false,
            message: 'Account not found'
          });
        }
        // STRICT ISOLATION: Verify account belongs to user's company
        if (!req.user || !req.user.company) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. User must be associated with a company.'
          });
        }

        const companyId = req.user.company._id || req.user.company;

        if (accountDoc.company && accountDoc.company.toString() !== companyId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Account does not belong to your company'
          });
        }
        accountName = accountDoc.name;
      } else if (providedAccountName) {
        // "Other" account - use provided name
        accountName = providedAccountName.trim();
        if (!accountName) {
          return res.status(400).json({
            success: false,
            message: 'Account name is required when selecting "Other"'
          });
        }
      }
    }

    // Create event
    const event = await Calendar.create({
      title,
      type,
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      account: type === 'visit' && account && account !== 'other' ? account : null,
      accountName: type === 'visit' ? accountName : null,
      description: description || '',
      createdBy: req.user._id,
      company: companyId  // Use the companyId from above
    });

    const populatedEvent = await Calendar.findById(event._id)
      .populate('account', 'name phone email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedEvent
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating calendar event'
    });
  }
};

// @desc    Update calendar event
// @route   PUT /api/calendar/:id
// @access  Private
// @isolation STRICT - Verifies event belongs to user's company before update
const updateCalendarEvent = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const event = await Calendar.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(event, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This event belongs to a different company.'
      });
    }

    // Check permissions for salesmen - they can only update their own events
    if (req.user.role === 'salesman') {
      // Handle both populated and non-populated createdBy
      let createdById;
      if (event.createdBy) {
        if (typeof event.createdBy === 'object' && event.createdBy._id) {
          createdById = event.createdBy._id.toString();
        } else {
          createdById = event.createdBy.toString();
        }
      }
      
      const userId = req.user._id.toString();
      
      if (!createdById || createdById !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this event'
        });
      }
    }

    const {
      title,
      date,
      startTime,
      endTime,
      account,
      accountName: providedAccountName,
      description,
      status,
      feedback
    } = req.body;

    // Update fields
    if (title !== undefined) event.title = title;
    if (date !== undefined) event.date = new Date(date);
    if (startTime !== undefined) event.startTime = startTime;
    if (endTime !== undefined) event.endTime = endTime;
    if (description !== undefined) event.description = description;
    if (status !== undefined) event.status = status;

    // Handle feedback for visits
    if (feedback !== undefined && event.type === 'visit') {
      event.feedback = feedback;
      if (feedback && feedback.trim()) {
        event.feedbackDate = new Date();
      } else {
        event.feedbackDate = null;
      }
    }

    // Update account if visit and account changed
    if (event.type === 'visit') {
      if (account !== undefined) {
        if (account && account !== 'other') {
          // Regular account from database
          const accountDoc = await Account.findById(account);
          if (!accountDoc) {
            return res.status(404).json({
              success: false,
              message: 'Account not found'
            });
          }
          // STRICT ISOLATION: Verify account belongs to user's company
          if (accountDoc.company && accountDoc.company.toString() !== companyId.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Account does not belong to your company'
            });
          }
          event.account = account;
          event.accountName = accountDoc.name;
        } else if (account === 'other' && providedAccountName) {
          // "Other" account - use provided name
          event.account = null;
          event.accountName = providedAccountName.trim();
          if (!event.accountName) {
            return res.status(400).json({
              success: false,
              message: 'Account name is required when selecting "Other"'
            });
          }
        }
      } else if (providedAccountName !== undefined && !event.account) {
        // Update account name for existing "other" account
        event.accountName = providedAccountName.trim();
      }
    }

    await event.save();

    const updatedEvent = await Calendar.findById(event._id)
      .populate('account', 'name phone email')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating calendar event'
    });
  }
};

// @desc    Delete calendar event
// @route   DELETE /api/calendar/:id
// @access  Private
// @isolation STRICT - Verifies event belongs to user's company before deletion
const deleteCalendarEvent = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const event = await Calendar.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(event, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This event belongs to a different company.'
      });
    }

    // Check permissions for salesmen - they can only delete their own events
    if (req.user.role === 'salesman') {
      // Handle both populated and non-populated createdBy
      let createdById;
      if (event.createdBy) {
        if (typeof event.createdBy === 'object' && event.createdBy._id) {
          createdById = event.createdBy._id.toString();
        } else {
          createdById = event.createdBy.toString();
        }
      }
      
      const userId = req.user._id.toString();
      
      if (!createdById || createdById !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this event'
        });
      }
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting calendar event'
    });
  }
};

// @desc    Send report email to company
// @route   POST /api/calendar/report
// @access  Private (Salesman only)
const sendReport = async (req, res) => {
  try {
    const { title, content, recipientEmail } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Report title and content are required'
      });
    }

    // Validate recipient email if provided
    if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient email address format'
      });
    }

    // Get company information
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Format report date
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Determine recipient email: use custom email if provided, otherwise use company email
    const targetEmail = recipientEmail || company.email;

    // Validate target email exists
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: recipientEmail 
          ? 'Recipient email is required' 
          : 'Company email not found. Please update company information or provide a recipient email.'
      });
    }

    // Send email
    const emailResult = await emailService.sendSalesmanReport({
      salesmanName: req.user.name || 'Salesman',
      salesmanEmail: req.user.email || 'salesman@example.com',
      companyName: company.name,
      companyEmail: targetEmail, // Use custom email or company email
      reportTitle: title,
      reportContent: content,
      reportDate: reportDate
    });

    if (emailResult.success) {
      console.log('✅ Report sent successfully:', {
        salesman: req.user.name,
        salesmanEmail: req.user.email,
        company: company.name,
        recipientEmail: targetEmail
      });
      res.status(200).json({
        success: true,
        message: recipientEmail 
          ? `Report sent successfully to ${targetEmail}`
          : 'Report sent successfully to company email'
      });
    } else {
      console.error('❌ Failed to send report email:', emailResult.message);
      // If email service is not configured, still return success but with a warning
      if (emailResult.fallback) {
        console.log('⚠️ Email service not configured, using fallback mode');
        res.status(200).json({
          success: true,
          message: 'Report prepared successfully (email service not configured)',
          warning: 'Email was not sent. Please configure email service.'
        });
      } else {
        res.status(500).json({
          success: false,
          message: emailResult.message || 'Failed to send report email. Please try again later.'
        });
      }
    }
  } catch (error) {
    console.error('❌ Send report error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.id,
      company: req.user?.company
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending report. Please try again later.'
    });
  }
};

module.exports = {
  getCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  sendReport
};

