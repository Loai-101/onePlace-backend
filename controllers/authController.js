const User = require('../models/User');
const Company = require('../models/Company');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { sendTokenResponse } = require('../middleware/auth');

// @desc    Register user (owner or other roles)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, username, password, role = 'salesman' } = req.body;

    // If trying to register as owner, check if owner already exists
    if (role === 'owner') {
      const ownerExists = await User.ownerExists();
      if (ownerExists) {
        return res.status(400).json({
          success: false,
          message: 'Owner already exists. Only one owner can be registered.'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      username,
      password,
      role
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account'
    });
  }
};

// @desc    Register company with owner
// @route   POST /api/auth/register-company
// @access  Public
const registerCompany = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      companyCity,
      companyCountry,
      ownerName,
      ownerEmail,
      ownerUsername,
      ownerPassword
    } = req.body;

    // Check if owner already exists
    const ownerExists = await User.ownerExists();
    if (ownerExists) {
      return res.status(400).json({
        success: false,
        message: 'System already has an owner. Company registration is closed.'
      });
    }

    // Check if company email already exists
    const existingCompany = await Company.findOne({ email: companyEmail });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this email already exists'
      });
    }

    // Check if owner user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: ownerEmail }, { username: ownerUsername }] 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Owner with this email or username already exists'
      });
    }

    // Generate unique approval number
    const approvalNumber = Math.floor(100000 + Math.random() * 900000).toString();

    // Create company (pending approval)
    const company = await Company.create({
      name: companyName,
      email: companyEmail,
      phone: companyPhone,
      address: companyAddress,
      city: companyCity,
      country: companyCountry,
      status: 'pending',
      approvalNumber: approvalNumber,
      approvedBy: null,
      approvedAt: null
    });

    // Create owner user (pending approval)
    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      username: ownerUsername,
      password: ownerPassword,
      role: 'owner',
      company: company._id,
      isActive: false, // Will be activated after approval
      isFirstLogin: true
    });

    // Update company with owner reference
    company.owner = owner._id;
    await company.save();

    // TODO: Send email to admin with company details and approval number
    // For now, we'll just return the approval number
    console.log(`Company Registration Request:
    Company: ${companyName}
    Email: ${companyEmail}
    Phone: ${companyPhone}
    Address: ${companyAddress}, ${companyCity}, ${companyCountry}
    Owner: ${ownerName} (${ownerEmail})
    Approval Number: ${approvalNumber}
    Please send this number to the company for approval.`);

    res.status(201).json({
      success: true,
      message: 'Company registration submitted successfully. Please wait for approval.',
      approvalNumber: approvalNumber,
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        status: company.status
      }
    });

  } catch (error) {
    console.error('Company registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating company registration'
    });
  }
};

// @desc    Login user (with email or username)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Validate input
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    // Check for user by email or username (include password for comparison)
    console.log('🔍 Login attempt:', {
      emailOrUsername,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    }).select('+password');

    if (!user) {
      console.log('❌ User not found:', emailOrUsername);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User found:', {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ Account is inactive:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log('❌ Password mismatch for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Login successful for user:', user.email);

    // Update first login flag
    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      await user.save();
    }

    // Populate company information
    await user.populate('company', 'name email phone status');

    // For owners/admins, check if company is approved
    if (user.role === 'owner' || user.role === 'admin') {
      if (user.company) {
        // Check if company exists and is approved
        if (user.company.status && user.company.status !== 'approved') {
          console.log('❌ Company not approved:', {
            companyId: user.company._id,
            status: user.company.status,
            userEmail: user.email
          });
          
          let message = 'Your company registration is pending approval.';
          if (user.company.status === 'pending') {
            message = 'Your company registration is pending approval. Please wait for admin approval before logging in.';
          } else if (user.company.status === 'rejected') {
            message = 'Your company registration was rejected. Please contact support for more information.';
          }
          
          return res.status(403).json({
            success: false,
            message: message,
            companyStatus: user.company.status
          });
        }
      } else {
        // Owner/admin without company - shouldn't happen but handle gracefully
        console.log('⚠️ Owner/admin user without company:', user.email);
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company', 'name email phone');

    // Format user response similar to login
    const userObj = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      permissions: user.permissions,
      profile: user.profile
    };

    // If company is populated, format it
    if (user.company && typeof user.company === 'object' && user.company._id) {
      userObj.company = {
        id: user.company._id,
        name: user.company.name,
        email: user.company.email,
        phone: user.company.phone
      };
    }

    res.status(200).json({
      success: true,
      user: userObj
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user information'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      profile: req.body.profile
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user details'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password'
    });
  }
};

// @desc    Create user (Owner only)
// @route   POST /api/auth/create-user
// @access  Private (Owner)
const createUser = async (req, res) => {
  try {
    const { name, email, username, password, role, company } = req.body;

    // Only owner can create users
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only owner can create users'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      username,
      password,
      role,
      owner: req.user._id,
      createdBy: req.user._id,
      company
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        company: user.company,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

// @desc    Get users created by owner
// @route   GET /api/auth/my-users
// @access  Private (Owner)
const getMyUsers = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only owner can view created users'
      });
    }

    const users = await req.user.getCreatedUsers();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get my users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Update user password (for first login or password reset)
// @route   PUT /api/auth/update-user-password/:userId
// @access  Private (Owner or User themselves)
const updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Check if user can update this password
    const canUpdate = req.user.role === 'owner' || req.user._id.toString() === userId;
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own password or owner can update any user password'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    user.isFirstLogin = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email'
      });
    }

    // Check if user has a company (required for admin to see the request)
    if (!user.company) {
      return res.status(400).json({
        success: false,
        message: 'Your account is not associated with a company. Please contact support for password reset.'
      });
    }

    // Check if there's already a pending request for this user
    const existingRequest = await PasswordResetRequest.findOne({
      user: user._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: 'Password reset request already submitted. Please wait for admin approval.'
      });
    }

    // Create password reset request
    const resetRequest = await PasswordResetRequest.create({
      user: user._id,
      email: user.email,
      status: 'pending'
    });

    console.log('✅ Password reset request created:', {
      requestId: resetRequest._id,
      userId: user._id,
      email: user.email,
      company: user.company,
      status: resetRequest.status,
      createdAt: resetRequest.createdAt
    });

    res.status(200).json({
      success: true,
      message: 'Password reset request submitted. An admin will review and reset your password.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request'
    });
  }
};

module.exports = {
  register,
  registerCompany,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  createUser,
  getMyUsers,
  updateUserPassword,
  forgotPassword
};
