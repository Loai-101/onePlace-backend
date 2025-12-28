const User = require('../models/User');
const Company = require('../models/Company');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Owner/Admin)
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      company,
      search,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // Build query
    let query = {};

    // Filter by user's company for all roles
    if (!req.user.company) {
      return res.status(404).json({
        success: false,
        message: 'User is not associated with a company'
      });
    }
    query.company = req.user.company;

    // Role filter
    if (role) {
      query.role = role;
    }

    // Additional company filter (if provided, must match user's company)
    if (company && company !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access users from your company.'
      });
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const users = await User.find(query)
      .populate('company', 'name location')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Owner/Admin)
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('company', 'name location contactInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Owner/Admin)
const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Owner/Admin)
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Owner/Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

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

// @desc    Update user permissions
// @route   PATCH /api/users/:id/permissions
// @access  Private (Owner/Admin)
const updateUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.permissions = permissions;
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user permissions'
    });
  }
};

// @desc    Get users by company
// @route   GET /api/users/company/:companyId
// @access  Private
const getUsersByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Ensure the requested company matches user's company
    if (companyId !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access users from your company.'
      });
    }

    const users = await User.find({ company: companyId, isActive: true })
      .select('name email role profile lastLogin')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company users'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/statistics
// @access  Private (Owner/Admin)
const getUserStatistics = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole: stats
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  getUsersByCompany,
  getUserStatistics
};
