const Admin = require('../models/Admin');
const Company = require('../models/Company');
const User = require('../models/User');
const CompanyUpdateRequest = require('../models/CompanyUpdateRequest');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username },
        { email: username }
      ],
      isActive: true
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        username: admin.username,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          lastLogin: admin.lastLogin
        },
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get all pending companies
// @route   GET /api/admin/companies/pending
// @access  Private (Admin)
const getPendingCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ status: 'pending' })
      .populate('owner', 'name email username isActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    console.error('Get pending companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending companies'
    });
  }
};

// @desc    Get all companies
// @route   GET /api/admin/companies
// @access  Private (Admin)
const getAllCompanies = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const companies = await Company.find(query)
      .populate('owner', 'name email username isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Company.countDocuments(query);

    res.status(200).json({
      success: true,
      count: companies.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: companies
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies'
    });
  }
};

// @desc    Get single company details
// @route   GET /api/admin/companies/:id
// @access  Private (Admin)
const getCompanyDetails = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'name email username role isActive');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company details'
    });
  }
};

// @desc    Approve company
// @route   PATCH /api/admin/companies/:id/approve
// @access  Private (Admin)
const approveCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (company.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Company is not in pending status'
      });
    }

    // Update company status
    company.status = 'approved';
    company.approvedAt = new Date();
    company.approvedBy = req.admin.adminId;
    await company.save();

    // Activate the owner user
    const owner = await User.findById(company.owner);
    if (owner) {
      owner.isActive = true;
      await owner.save();
    }

    // Send approval email to company
    try {
      const emailData = {
        companyName: company.name,
        companyEmail: company.email,
        ownerName: owner?.name || 'N/A',
        ownerEmail: owner?.email || 'N/A',
        ownerUsername: owner?.username || 'N/A'
      };

      const emailResult = await emailService.sendCompanyApprovalEmail(emailData);
      
      if (emailResult.success) {
        console.log('✅ Approval email sent successfully to:', company.email);
      } else {
        console.log('⚠️ Approval email failed, but company was approved:', emailResult.message);
      }
    } catch (emailError) {
      console.error('❌ Error sending approval email:', emailError);
      // Don't fail the approval if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Company approved successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          status: company.status,
          approvedAt: company.approvedAt
        }
      }
    });
  } catch (error) {
    console.error('Approve company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving company'
    });
  }
};

// @desc    Reject company
// @route   PATCH /api/admin/companies/:id/reject
// @access  Private (Admin)
const rejectCompany = async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (company.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Company is not in pending status'
      });
    }

    // Update company status
    company.status = 'rejected';
    company.rejectedAt = new Date();
    company.rejectedBy = req.admin.adminId;
    company.rejectionReason = reason;
    await company.save();

    // Get owner information for email
    const owner = await User.findById(company.owner);

    // Send rejection email to company
    try {
      const emailData = {
        companyName: company.name,
        companyEmail: company.email,
        ownerName: owner?.name || 'N/A',
        ownerEmail: owner?.email || 'N/A',
        ownerUsername: owner?.username || 'N/A'
      };

      const emailResult = await emailService.sendCompanyRejectionEmail(emailData, reason || '');
      
      if (emailResult.success) {
        console.log('✅ Rejection email sent successfully to:', company.email);
      } else {
        console.log('⚠️ Rejection email failed, but company was rejected:', emailResult.message);
      }
    } catch (emailError) {
      console.error('❌ Error sending rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Company rejected successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          status: company.status,
          rejectedAt: company.rejectedAt,
          rejectionReason: company.rejectionReason
        }
      }
    });
  } catch (error) {
    console.error('Reject company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting company'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCompanies,
      pendingCompanies,
      approvedCompanies,
      rejectedCompanies,
      totalUsers,
      recentCompanies
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: 'pending' }),
      Company.countDocuments({ status: 'approved' }),
      Company.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      Company.find()
        .populate('owner', 'name email username isActive')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          totalCompanies,
          pendingCompanies,
          approvedCompanies,
          rejectedCompanies,
          totalUsers
        },
        recentCompanies
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// @desc    Change company account status (hold/activate)
// @route   PATCH /api/admin/companies/:id/status
// @access  Private (Admin)
const changeCompanyAccountStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const companyId = req.params.id;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"'
      });
    }

    const company = await Company.findById(companyId).populate('owner');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!company.owner) {
      return res.status(400).json({
        success: false,
        message: 'Company owner not found'
      });
    }

    // Update owner account status
    const owner = company.owner;
    owner.isActive = status === 'active';
    await owner.save();

    // Update company status if needed
    if (status === 'inactive' && company.status === 'approved') {
      company.status = 'hold';
      company.heldAt = new Date();
      company.heldBy = req.admin.adminId;
    } else if (status === 'active' && company.status === 'hold') {
      company.status = 'approved';
      company.activatedAt = new Date();
      company.activatedBy = req.admin.adminId;
    }
    await company.save();

    res.status(200).json({
      success: true,
      message: `Company account ${status === 'inactive' ? 'deactivated' : 'activated'} successfully`,
      data: {
        company: {
          id: company._id,
          name: company.name,
          status: company.status,
          ownerStatus: owner.isActive ? 'active' : 'inactive'
        }
      }
    });
  } catch (error) {
    console.error('Change company account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing company account status'
    });
  }
};

// @desc    Get all admins
// @route   GET /api/admin/admins
// @access  Private (Admin)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins'
    });
  }
};

// @desc    Create new admin
// @route   POST /api/admin/admins
// @access  Private (Admin)
const createAdmin = async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this username or email already exists'
      });
    }

    // Create new admin
    const adminData = {
      username,
      email,
      password,
      role: role || 'admin',
      permissions: permissions || {
        manageCompanies: false,
        manageUsers: false,
        viewReports: false,
        systemSettings: false
      }
    };

    const admin = new Admin(adminData);
    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('Create admin error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating admin',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update admin role and permissions
// @route   PATCH /api/admin/admins/:id
// @access  Private (Admin)
const updateAdmin = async (req, res) => {
  try {
    const { role, permissions, isActive } = req.body;
    const adminId = req.params.id;

    // Don't allow updating own account
    if (adminId === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot modify your own account'
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Update fields
    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin'
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/admins/:id
// @access  Private (Admin)
const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    // Don't allow deleting own account
    if (adminId === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting admin'
    });
  }
};

// @desc    Update both company status and account status
// @route   PATCH /api/admin/companies/:id/update-status
// @access  Private (Admin)
const updateCompanyAndAccountStatus = async (req, res) => {
  try {
    const { companyStatus, accountStatus, numberOfUsers } = req.body;
    const companyId = req.params.id;

    // Validate company status
    if (companyStatus && !['pending', 'approved', 'rejected', 'hold'].includes(companyStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company status. Must be "pending", "approved", "rejected", or "hold"'
      });
    }

    // Validate account status
    if (accountStatus && !['active', 'inactive'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status. Must be "active" or "inactive"'
      });
    }

    const company = await Company.findById(companyId).populate('owner');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!company.owner) {
      return res.status(400).json({
        success: false,
        message: 'Company owner not found'
      });
    }

    const owner = company.owner;
    let changes = [];

    // Update number of users if provided
    if (numberOfUsers !== undefined && numberOfUsers !== company.numberOfUsers) {
      const oldNumberOfUsers = company.numberOfUsers;
      company.numberOfUsers = numberOfUsers;
      changes.push(`Number of users changed from ${oldNumberOfUsers} to ${numberOfUsers}`);
    }

    // Update company status if provided
    if (companyStatus && companyStatus !== company.status) {
      const oldStatus = company.status;
      company.status = companyStatus;
      
      // Set appropriate timestamps and admin info
      switch (companyStatus) {
        case 'approved':
          company.approvedAt = new Date();
          company.approvedBy = req.admin.adminId;
          // Clear rejection info if it exists
          company.rejectedAt = undefined;
          company.rejectedBy = undefined;
          company.rejectionReason = undefined;
          break;
        case 'rejected':
          company.rejectedAt = new Date();
          company.rejectedBy = req.admin.adminId;
          company.rejectionReason = req.body.rejectionReason || 'Status changed by admin';
          break;
        case 'hold':
          company.heldAt = new Date();
          company.heldBy = req.admin.adminId;
          break;
        case 'pending':
          // Reset all status-related fields
          company.approvedAt = undefined;
          company.approvedBy = undefined;
          company.rejectedAt = undefined;
          company.rejectedBy = undefined;
          company.rejectionReason = undefined;
          company.heldAt = undefined;
          company.heldBy = undefined;
          break;
      }
      
      changes.push(`Company status changed from ${oldStatus} to ${companyStatus}`);
    }

    // Update account status if provided
    if (accountStatus !== undefined && owner.isActive !== (accountStatus === 'active')) {
      const oldAccountStatus = owner.isActive ? 'active' : 'inactive';
      const newIsActive = accountStatus === 'active';
      
      // Update owner's status
      owner.isActive = newIsActive;
      
      // Update ALL company users' status (not just the owner)
      const updateResult = await User.updateMany(
        { company: companyId },
        { $set: { isActive: newIsActive } }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} users to ${accountStatus}`);
      
      // Update company status based on account status if needed
      if (accountStatus === 'inactive' && company.status === 'approved') {
        company.status = 'hold';
        company.heldAt = new Date();
        company.heldBy = req.admin.adminId;
        changes.push(`Company status automatically changed to hold due to account deactivation`);
      } else if (accountStatus === 'active' && company.status === 'hold') {
        company.status = 'approved';
        company.activatedAt = new Date();
        company.activatedBy = req.admin.adminId;
        changes.push(`Company status automatically changed to approved due to account activation`);
      }
      
      const userCount = await User.countDocuments({ company: companyId });
      changes.push(`Account status changed from ${oldAccountStatus} to ${accountStatus} (Applied to all ${userCount} users)`);
    }

    // Save changes
    await company.save();
    await owner.save();

    // Send email notifications if status changed to approved or rejected
    if (companyStatus === 'approved' || companyStatus === 'rejected') {
      try {
        const emailData = {
          companyName: company.name,
          companyEmail: company.email,
          ownerName: owner?.name || 'N/A',
          ownerEmail: owner?.email || 'N/A',
          ownerUsername: owner?.username || 'N/A'
        };

        if (companyStatus === 'approved') {
          const emailResult = await emailService.sendCompanyApprovalEmail(emailData);
          if (emailResult.success) {
            console.log('✅ Approval email sent successfully to:', company.email);
          }
        } else if (companyStatus === 'rejected') {
          const emailResult = await emailService.sendCompanyRejectionEmail(emailData, company.rejectionReason || '');
          if (emailResult.success) {
            console.log('✅ Rejection email sent successfully to:', company.email);
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending status email:', emailError);
        // Don't fail the update if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Company and account status updated successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          status: company.status,
          ownerStatus: owner.isActive ? 'active' : 'inactive'
        },
        changes: changes
      }
    });
  } catch (error) {
    console.error('Update company and account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company and account status'
    });
  }
};

// @desc    Get company users
// @route   GET /api/admin/companies/:id/users
// @access  Private (Admin)
const getCompanyUsers = async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const users = await User.find({ company: companyId })
      .select('-password')
      .sort({ role: 1, createdAt: 1 }); // Admin first, then by creation date
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company users'
    });
  }
};

// @desc    Get all company update requests
// @route   GET /api/admin/company-update-requests
// @access  Private (Admin)
const getCompanyUpdateRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }

    const requests = await CompanyUpdateRequest.find(query)
      .populate('company')
      .populate('requestedBy', 'name email username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username')
      .sort({ createdAt: -1 });

    // Calculate changed fields for each request
    const requestsWithChanges = requests.map(request => {
      const requestObj = request.toObject();
      const currentCompany = request.company.toObject();
      const requestedChanges = request.requestedChanges || {};
      const changedFields = {};

      // Compare each field and only include if it's different
      Object.keys(requestedChanges).forEach(key => {
        if (key === 'logo') {
          // Special handling for logo object
          if (requestedChanges.logo && requestedChanges.logo.url) {
            const currentLogoUrl = currentCompany.logo?.url || '';
            if (requestedChanges.logo.url !== currentLogoUrl) {
              changedFields[key] = requestedChanges[key];
            }
          }
        } else if (JSON.stringify(currentCompany[key]) !== JSON.stringify(requestedChanges[key])) {
          changedFields[key] = requestedChanges[key];
        }
      });

      requestObj.changedFields = changedFields;
      return requestObj;
    });

    res.status(200).json({
      success: true,
      count: requestsWithChanges.length,
      data: requestsWithChanges
    });
  } catch (error) {
    console.error('Get company update requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company update requests'
    });
  }
};

// @desc    Get single company update request
// @route   GET /api/admin/company-update-requests/:id
// @access  Private (Admin)
const getCompanyUpdateRequest = async (req, res) => {
  try {
    const request = await CompanyUpdateRequest.findById(req.params.id)
      .populate('company')
      .populate('requestedBy', 'name email username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Update request not found'
      });
    }

    // Calculate only the changed fields
    const currentCompany = request.company.toObject();
    const requestedChanges = request.requestedChanges || {};
    const changedFields = {};

    // Compare each field and only include if it's different
    Object.keys(requestedChanges).forEach(key => {
      if (key === 'logo') {
        // Special handling for logo object
        if (requestedChanges.logo && requestedChanges.logo.url) {
          const currentLogoUrl = currentCompany.logo?.url || '';
          if (requestedChanges.logo.url !== currentLogoUrl) {
            changedFields[key] = requestedChanges[key];
          }
        }
      } else if (JSON.stringify(currentCompany[key]) !== JSON.stringify(requestedChanges[key])) {
        changedFields[key] = requestedChanges[key];
      }
    });

    const requestObj = request.toObject();
    requestObj.changedFields = changedFields;

    res.status(200).json({
      success: true,
      data: requestObj
    });
  } catch (error) {
    console.error('Get company update request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company update request'
    });
  }
};

// @desc    Approve company update request
// @route   PATCH /api/admin/company-update-requests/:id/approve
// @access  Private (Admin)
const approveCompanyUpdateRequest = async (req, res) => {
  try {
    const request = await CompanyUpdateRequest.findById(req.params.id)
      .populate('company');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Update request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Update the company with the requested changes
    const company = await Company.findByIdAndUpdate(
      request.company._id,
      request.requestedChanges,
      {
        new: true,
        runValidators: true
      }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update the request status
    request.status = 'approved';
    request.approvedBy = req.admin._id;
    request.approvedAt = new Date();
    if (req.body.notes) {
      request.notes = req.body.notes;
    }
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Company update request approved successfully',
      data: {
        request: request,
        company: company
      }
    });
  } catch (error) {
    console.error('Approve company update request error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error approving company update request'
    });
  }
};

// @desc    Reject company update request
// @route   PATCH /api/admin/company-update-requests/:id/reject
// @access  Private (Admin)
const rejectCompanyUpdateRequest = async (req, res) => {
  try {
    const request = await CompanyUpdateRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Update request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Update the request status
    request.status = 'rejected';
    request.rejectedBy = req.admin._id;
    request.rejectedAt = new Date();
    request.rejectionReason = req.body.reason || 'No reason provided';
    if (req.body.notes) {
      request.notes = req.body.notes;
    }
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Company update request rejected successfully',
      data: request
    });
  } catch (error) {
    console.error('Reject company update request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting company update request'
    });
  }
};

// @desc    Get all password reset requests (for admin)
// @route   GET /api/admin/password-reset-requests
// @access  Private (Admin)
const getPasswordResetRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const requests = await PasswordResetRequest.find(query)
      .populate('user', 'name email username role company')
      .populate('completedBy', 'name email username')
      .sort({ createdAt: -1 });

    // Populate company for each user
    const requestsWithCompany = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();
        if (requestObj.user && requestObj.user.company) {
          const company = await Company.findById(requestObj.user.company);
          requestObj.user.company = company;
        }
        return requestObj;
      })
    );

    console.log('✅ Admin found password reset requests:', {
      count: requestsWithCompany.length,
      statusFilter: status
    });

    res.status(200).json({
      success: true,
      count: requestsWithCompany.length,
      data: requestsWithCompany
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching password reset requests'
    });
  }
};

// @desc    Get single password reset request (for admin)
// @route   GET /api/admin/password-reset-requests/:id
// @access  Private (Admin)
const getPasswordResetRequest = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate('user', 'name email username role company')
      .populate('completedBy', 'name email username');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Password reset request not found'
      });
    }

    // Populate company
    if (request.user && request.user.company) {
      const company = await Company.findById(request.user.company);
      request.user.company = company;
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching password reset request'
    });
  }
};

// @desc    Complete password reset request (for admin)
// @route   PUT /api/admin/password-reset-requests/:id/complete
// @access  Private (Admin)
const completePasswordResetRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, notes } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const request = await PasswordResetRequest.findById(id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Password reset request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update user password
    const user = await User.findById(request.user._id);
    user.password = newPassword;
    user.isFirstLogin = true; // Mark as first login to prompt password change
    await user.save();

    // Update request
    request.status = 'completed';
    // Note: PasswordResetRequest.completedBy references User, not Admin
    // We'll store admin info in notes instead
    request.completedAt = new Date();
    request.newPassword = newPassword; // Store for reference
    const adminNote = `Completed by admin: ${req.admin.username || req.admin.email}`;
    request.notes = notes ? `${adminNote}\n${notes}` : adminNote;
    await request.save();

    console.log('✅ Admin completed password reset request:', {
      requestId: request._id,
      userId: user._id,
      email: user.email,
      adminId: req.admin.id
    });

    res.status(200).json({
      success: true,
      message: 'Password reset completed successfully',
      data: request
    });
  } catch (error) {
    console.error('Complete password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing password reset request'
    });
  }
};

// @desc    Reject password reset request (for admin)
// @route   PUT /api/admin/password-reset-requests/:id/reject
// @access  Private (Admin)
const rejectPasswordResetRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await PasswordResetRequest.findById(id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Password reset request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update request
    request.status = 'rejected';
    request.completedAt = new Date();
    const adminNote = `Rejected by admin: ${req.admin.username || req.admin.email}`;
    request.notes = notes ? `${adminNote}\nReason: ${notes}` : adminNote;
    await request.save();

    console.log('✅ Admin rejected password reset request:', {
      requestId: request._id,
      userId: request.user._id,
      email: request.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Password reset request rejected successfully',
      data: request
    });
  } catch (error) {
    console.error('Reject password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting password reset request'
    });
  }
};

module.exports = {
  adminLogin,
  getPendingCompanies,
  getAllCompanies,
  getCompanyDetails,
  approveCompany,
  rejectCompany,
  getDashboardStats,
  changeCompanyAccountStatus,
  updateCompanyAndAccountStatus,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getCompanyUsers,
  getCompanyUpdateRequests,
  getCompanyUpdateRequest,
  approveCompanyUpdateRequest,
  rejectCompanyUpdateRequest,
  getPasswordResetRequests,
  getPasswordResetRequest,
  completePasswordResetRequest,
  rejectPasswordResetRequest
};
