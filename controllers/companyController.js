const Company = require('../models/Company');
const User = require('../models/User');
const CompanyUpdateRequest = require('../models/CompanyUpdateRequest');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');


// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
const getCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Filter by user's company for all roles (companies are customer companies, not user companies)
    // This endpoint returns customer companies, so we don't filter by user.company
    // Instead, we ensure users can only see companies that are associated with their orders/accounts
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query['paymentInfo.status'] = status;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const companies = await Company.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
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
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies'
    });
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

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
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company'
    });
  }
};

// @desc    Create new company
// @route   POST /api/companies
// @access  Private (Owner/Admin)
const createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);

    res.status(201).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating company'
    });
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Owner/Admin)
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

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
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company'
    });
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private (Owner/Admin)
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Soft delete
    company.isActive = false;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting company'
    });
  }
};

// @desc    Get company sales history
// @route   GET /api/companies/:id/sales-history
// @access  Private
const getCompanySalesHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get sales history with pagination
    const salesHistory = company.salesHistory
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    res.status(200).json({
      success: true,
      count: salesHistory.length,
      total: company.salesHistory.length,
      data: salesHistory
    });
  } catch (error) {
    console.error('Get company sales history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company sales history'
    });
  }
};

// @desc    Update company payment info
// @route   PATCH /api/companies/:id/payment
// @access  Private (Owner/Admin/Accountant)
const updateCompanyPayment = async (req, res) => {
  try {
    const { creditLimit, currentBalance, paymentTerms, status } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update payment info
    if (creditLimit !== undefined) company.paymentInfo.creditLimit = creditLimit;
    if (currentBalance !== undefined) company.paymentInfo.currentBalance = currentBalance;
    if (paymentTerms !== undefined) company.paymentInfo.paymentTerms = paymentTerms;
    if (status !== undefined) company.paymentInfo.status = status;

    await company.save();

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Update company payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company payment info'
    });
  }
};

// @desc    Add employee to company
// @route   POST /api/companies/:id/employees
// @access  Private (Owner/Admin)
const addEmployee = async (req, res) => {
  try {
    const { name, role, email, phone } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Add employee
    company.employees.push({
      name,
      role,
      email,
      phone,
      isActive: true
    });

    await company.save();

    res.status(201).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding employee'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/companies/:id/employees/:employeeId
// @access  Private (Owner/Admin)
const updateEmployee = async (req, res) => {
  try {
    const { id, employeeId } = req.params;
    const { name, role, email, phone, isActive } = req.body;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const employee = company.employees.id(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update employee
    if (name !== undefined) employee.name = name;
    if (role !== undefined) employee.role = role;
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone;
    if (isActive !== undefined) employee.isActive = isActive;

    await company.save();

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee'
    });
  }
};

// @desc    Remove employee from company
// @route   DELETE /api/companies/:id/employees/:employeeId
// @access  Private (Owner/Admin)
const removeEmployee = async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const employee = company.employees.id(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Remove employee
    employee.remove();
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Employee removed successfully',
      data: company
    });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing employee'
    });
  }
};

// @desc    Check database status
// @route   GET /api/companies/status
// @access  Public
const getDatabaseStatus = async (req, res) => {
  try {
    const companyCount = await Company.countDocuments();
    const userCount = await User.countDocuments();
    
    // Get existing usernames to help with debugging
    const existingUsers = await User.find({}, 'username email').limit(10);
    
    res.status(200).json({
      success: true,
      data: {
        companies: companyCount,
        users: userCount,
        existingUsernames: existingUsers.map(user => user.username),
        existingEmails: existingUsers.map(user => user.email),
        message: `Database has ${companyCount} companies and ${userCount} users`
      }
    });
  } catch (error) {
    console.error('Database status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking database status'
    });
  }
};

// @desc    Register new company with owner
// @route   POST /api/companies/register
// @access  Public
const registerCompany = async (req, res) => {
  try {
    const {
      // Company Information
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
      
      // Address Information
      companyAddress,
      companyCity,
      companyCountry,
      postalCode,
      
      // Owner Information
      ownerName,
      ownerEmail,
      ownerUsername,
      ownerPassword
    } = req.body;

    // Check if company name already exists
    const existingCompanyName = await Company.findOne({ name: companyName });
    if (existingCompanyName) {
      return res.status(400).json({
        success: false,
        message: 'Company with this name already exists'
      });
    }

    // Check if company email already exists
    const existingCompanyEmail = await Company.findOne({ email: companyEmail });
    if (existingCompanyEmail) {
      return res.status(400).json({
        success: false,
        message: 'Company with this email already exists'
      });
    }

    // Check if owner email already exists
    const existingOwnerEmail = await User.findOne({ email: ownerEmail });
    if (existingOwnerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Owner email already exists'
      });
    }

    // Check if owner username already exists
    console.log('🔍 Checking username:', ownerUsername);
    const existingUsername = await User.findOne({ username: ownerUsername });
    if (existingUsername) {
      console.log('❌ Username already exists:', ownerUsername);
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    console.log('✅ Username is unique:', ownerUsername);

    // Create the company
    const company = await Company.create({
      name: companyName,
      email: companyEmail,
      phone: companyPhone,
      ibanNumber,
      bankName,
      vatNumber,
      crNumber,
      companyType,
      dueDate: new Date(dueDate),
      companySize,
      businessTarget,
      numberOfUsers,
      address: companyAddress,
      city: companyCity,
      country: companyCountry,
      postalCode,
      ownerName,
      ownerEmail,
      ownerUsername,
      ownerPassword: ownerPassword, // Store plain password, will be hashed by User model
      status: 'pending'
    });

    // Create the company owner user (password will be hashed by User model's pre-save hook)
    console.log('👤 Creating company owner user with:', {
      name: ownerName,
      email: ownerEmail,
      username: ownerUsername,
      role: 'admin',
      company: company._id
    });
    
    let owner;
    try {
      owner = await User.create({
        name: ownerName,
        email: ownerEmail,
        username: ownerUsername,
        password: ownerPassword, // Plain password, will be hashed automatically
        role: 'admin', // Use admin role for company owners to avoid conflicts
        company: company._id,
        isActive: false, // Inactive until company is approved by admin
        isFirstLogin: true
      });
      
      console.log('✅ Company owner user created successfully:', {
        id: owner._id,
        email: owner.email,
        username: owner.username,
        role: owner.role
      });
    } catch (userError) {
      console.error('❌ Failed to create user:', userError);
      console.error('User creation error details:', {
        name: userError.name,
        message: userError.message,
        code: userError.code
      });
      
      // Delete the company if user creation fails
      await Company.findByIdAndDelete(company._id);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create company owner user',
        error: userError.message
      });
    }

    // Update company with owner reference
    company.owner = owner._id;
    await company.save();

    // Send email notification using FormSubmit
    try {
      await emailService.sendCompanyRegistrationEmail({
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
      });
      console.log('Registration email sent successfully to q9g8moh@gmail.com');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the registration if email fails
    }

    console.log('✅ Company registration successful:', {
      companyId: company._id,
      companyName: company.name,
      ownerId: owner._id,
      ownerUsername: owner.username
    });

    res.status(201).json({
      success: true,
      message: 'Company registration submitted successfully. Awaiting approval.',
      data: {
        company: {
          id: company._id,
          name: company.name,
          email: company.email,
          status: company.status
        },
        owner: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          username: owner.username,
          role: owner.role
        }
      }
    });

  } catch (error) {
    console.error('Register company error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
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
      message: 'Error registering company'
    });
  }
};

// @desc    Get current user's company
// @route   GET /api/companies/me
// @access  Private
const getMyCompany = async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(404).json({
        success: false,
        message: 'User is not associated with a company'
      });
    }

    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check for pending update requests
    const pendingRequest = await CompanyUpdateRequest.findOne({
      company: req.user.company,
      status: 'pending'
    }).sort({ createdAt: -1 });

    // Check for recently approved requests (approved in the last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const approvedRequest = await CompanyUpdateRequest.findOne({
      company: req.user.company,
      status: 'approved',
      approvedAt: { $gte: oneDayAgo }
    }).sort({ approvedAt: -1 }).populate('approvedBy', 'name username');

    const companyObj = company.toObject();
    if (pendingRequest) {
      companyObj.pendingUpdateRequest = {
        id: pendingRequest._id,
        createdAt: pendingRequest.createdAt,
        requestedChanges: pendingRequest.requestedChanges
      };
    }
    
    if (approvedRequest) {
      companyObj.recentlyApprovedRequest = {
        id: approvedRequest._id,
        approvedAt: approvedRequest.approvedAt,
        approvedBy: approvedRequest.approvedBy
      };
    }

    res.status(200).json({
      success: true,
      data: companyObj
    });
  } catch (error) {
    console.error('Get my company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company'
    });
  }
};

// @desc    Update current user's company (creates approval request)
// @route   PUT /api/companies/me
// @access  Private (Owner/Admin)
const updateMyCompany = async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(404).json({
        success: false,
        message: 'User is not associated with a company'
      });
    }

    // Check if user has permission (owner or admin role)
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only owners and admins can update company information'
      });
    }

    const company = await Company.findById(req.user.company);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Create update request instead of directly updating
    const updateRequest = await CompanyUpdateRequest.create({
      company: req.user.company,
      requestedBy: req.user.id,
      requestedChanges: req.body,
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      message: 'Company update request submitted successfully. Waiting for admin approval.',
      data: {
        requestId: updateRequest._id,
        status: 'pending',
        company: company
      }
    });
  } catch (error) {
    console.error('Update my company error:', error);
    
    // Handle validation errors
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
      message: 'Error creating update request'
    });
  }
};

module.exports = {
  getCompanies,
  getCompany,
  getMyCompany,
  updateMyCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanySalesHistory,
  updateCompanyPayment,
  addEmployee,
  updateEmployee,
  removeEmployee,
  registerCompany,
  getDatabaseStatus
};
