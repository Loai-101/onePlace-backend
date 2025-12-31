const User = require('../models/User');
const Company = require('../models/Company');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const emailService = require('../services/emailService');

// @desc    Get all users for the logged-in owner's company
// @route   GET /api/user-management
// @access  Private (Owner/Admin)
const getCompanyUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.company) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with a company'
      });
    }

    // Get company to check user limit
    const company = await Company.findById(user.company);
    
    // Find all users in the same company
    const users = await User.find({ company: user.company })
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      maxUsers: company?.numberOfUsers || 0,
      data: users
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Get single user details
// @route   GET /api/user-management/:id
// @access  Private (Owner/Admin)
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('company', 'name email phone')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if the requesting user has access to this user
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = user.company._id ? user.company._id.toString() : user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();
    
    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this user'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
};

// @desc    Create new user
// @route   POST /api/user-management
// @access  Private (Owner/Admin)
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      password,
      role,
      phone,
      address,
      city,
      postalCode,
      country,
      avatar,
      position,
      department
    } = req.body;

    const creatorId = req.user.id;
    const creator = await User.findById(creatorId);

    if (!creator || !creator.company) {
      return res.status(400).json({
        success: false,
        message: 'Creator must be associated with a company'
      });
    }

    // Get company to check user limit
    const company = await Company.findById(creator.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user limit is reached
    const currentUserCount = await User.countDocuments({ company: creator.company });
    
    if (currentUserCount >= company.numberOfUsers) {
      return res.status(400).json({
        success: false,
        message: `User limit reached. Your company is allowed ${company.numberOfUsers} users.`
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Validate role - only salesman and accountant allowed, no additional admins
    if (!['salesman', 'accountant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only Salesman and Accountant roles can be created. Each company can only have one admin (the owner).'
      });
    }

    // Create user
    const newUser = await User.create({
      name,
      email,
      username,
      password,
      role,
      company: creator.company,
      createdBy: creatorId,
      isActive: true,
      profile: {
        phone,
        address,
        city,
        postalCode,
        country,
        avatar,
        position,
        department
      }
    });

    // Send welcome email with credentials
    try {
      await emailService.sendUserCredentialsEmail({
        userName: name,
        userEmail: email,
        username,
        password, // Plain password before hashing
        companyName: company.name,
        role
      });
      console.log('✅ Credentials email sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Failed to send credentials email:', emailError);
      // Don't fail user creation if email fails
    }

    // Return user without password
    const userResponse = await User.findById(newUser._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully. Credentials sent via email.',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
};

// @desc    Update user
// @route   PATCH /api/user-management/:id
// @access  Private (Owner/Admin)
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if the requesting user has access to update this user
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = user.company._id ? user.company._id.toString() : user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();
    
    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user'
      });
    }

    // Validate role only if it's being changed to a different role
    if (updates.role && updates.role !== user.role) {
      // Only validate if changing to a new role (not keeping the same role)
      if (!['salesman', 'accountant'].includes(updates.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Only Salesman and Accountant roles can be assigned. Each company can only have one admin (the owner).'
        });
      }
    }
    
    // If role is provided but same as current, don't update it (to avoid unnecessary validation)
    if (updates.role && updates.role === user.role) {
      delete updates.role; // Remove role from updates if it's not changing
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'email', 'phone', 'address', 'city', 'postalCode', 'country', 'avatar', 'position', 'department', 'role'];
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (['phone', 'address', 'city', 'postalCode', 'country', 'avatar', 'position', 'department'].includes(key)) {
          user.profile[key] = updates[key];
        } else {
          user[key] = updates[key];
        }
      }
    });

    await user.save();

    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user'
    });
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/user-management/:id/toggle-status
// @access  Private (Owner/Admin)
const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent users from deactivating themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if the requesting user has access
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = user.company._id ? user.company._id.toString() : user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();
    
    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user'
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
};

// @desc    Reset user password
// @route   POST /api/user-management/:id/reset-password
// @access  Private (Owner/Admin)
const resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if the requesting user has access
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = user.company._id ? user.company._id.toString() : user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();
    
    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reset this user\'s password'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.isFirstLogin = true; // Mark as first login to prompt password change
    await user.save();

    // Send email with new password
    try {
      const company = await Company.findById(user.company);
      await emailService.sendPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        newPassword,
        companyName: company.name
      });
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send password reset email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. New password sent via email.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/user-management/:id
// @access  Private (Owner/Admin)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent users from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if the requesting user has access
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = user.company._id ? user.company._id.toString() : user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();
    
    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this user'
      });
    }

    // Prevent deleting the last admin/owner
    if (user.role === 'admin' || user.role === 'owner') {
      const adminCount = await User.countDocuments({
        company: user.company,
        role: { $in: ['admin', 'owner'] },
        _id: { $ne: userId }
      });
      
      if (adminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin. Company must have at least one admin.'
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// @desc    Update salesman forecast
// @route   POST /api/user-management/:id/forecast
// @access  Private (Owner/Admin/Salesman)
const updateSalesmanForecast = async (req, res) => {
  try {
    const userId = req.params.id;
    const { month, year, targetAmount } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'salesman') {
      return res.status(400).json({
        success: false,
        message: 'Forecast can only be set for salesmen'
      });
    }

    // Check if forecast for this month/year already exists
    const existingForecastIndex = user.salesmanInfo.forecast.findIndex(
      f => f.month === month && f.year === year
    );

    if (existingForecastIndex !== -1) {
      // Update existing forecast
      user.salesmanInfo.forecast[existingForecastIndex].targetAmount = targetAmount;
    } else {
      // Add new forecast
      user.salesmanInfo.forecast.push({
        month,
        year,
        targetAmount,
        actualAmount: 0
      });
    }

    await user.save();

    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      message: 'Forecast updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating forecast'
    });
  }
};

// @desc    Get password reset requests for company
// @route   GET /api/user-management/password-reset-requests
// @access  Private (Owner/Admin)
const getPasswordResetRequests = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    
    if (!requestingUser || !requestingUser.company) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with a company'
      });
    }

    const { status } = req.query;
    let query = {};

    // Get all users in the company
    const companyUsers = await User.find({ company: requestingUser.company }).select('_id');
    const userIds = companyUsers.map(u => u._id);

    console.log('🔍 Password Reset Requests Query:', {
      requestingUserId: req.user.id,
      requestingUserCompany: requestingUser.company,
      companyUsersCount: companyUsers.length,
      userIds: userIds.length,
      statusFilter: status
    });

    query.user = { $in: userIds };

    if (status) {
      query.status = status;
    }

    const requests = await PasswordResetRequest.find(query)
      .populate('user', 'name email username role company')
      .populate('completedBy', 'name email username')
      .sort({ createdAt: -1 });

    console.log('✅ Found password reset requests:', {
      count: requests.length,
      requests: requests.map(r => ({
        id: r._id,
        email: r.email,
        userId: r.user?._id,
        userName: r.user?.name,
        status: r.status,
        createdAt: r.createdAt
      }))
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching password reset requests'
    });
  }
};

// @desc    Complete password reset request
// @route   PUT /api/user-management/password-reset-requests/:id/complete
// @access  Private (Owner/Admin)
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

    // Check if requesting user has access (same company)
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = request.user.company._id ? request.user.company._id.toString() : request.user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();

    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to complete this request'
      });
    }

    // Update user password
    const user = await User.findById(request.user._id);
    user.password = newPassword;
    user.isFirstLogin = true; // Mark as first login to prompt password change
    await user.save();

    // Update request
    request.status = 'completed';
    request.completedBy = req.user.id;
    request.completedAt = new Date();
    request.newPassword = newPassword; // Store for reference (will be hashed if needed)
    if (notes) {
      request.notes = notes;
    }
    await request.save();

    // Send email with new password
    try {
      const company = await Company.findById(user.company);
      await emailService.sendPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        newPassword,
        companyName: company.name
      });
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send password reset email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset completed. New password sent via email.',
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

// @desc    Reject password reset request
// @route   PUT /api/user-management/password-reset-requests/:id/reject
// @access  Private (Owner/Admin)
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

    // Check if requesting user has access (same company)
    const requestingUser = await User.findById(req.user.id);
    const userCompanyId = request.user.company._id ? request.user.company._id.toString() : request.user.company.toString();
    const requestingUserCompanyId = requestingUser.company.toString();

    if (userCompanyId !== requestingUserCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this request'
      });
    }

    // Update request
    request.status = 'rejected';
    if (notes) {
      request.notes = notes;
    }
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Password reset request rejected',
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
  getCompanyUsers,
  getUserDetails,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  updateSalesmanForecast,
  getPasswordResetRequests,
  completePasswordResetRequest,
  rejectPasswordResetRequest
};

