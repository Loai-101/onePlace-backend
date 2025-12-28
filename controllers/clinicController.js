const Company = require('../models/Company');

// @desc    Get all clinics (companies with clinic type)
// @route   GET /api/clinics
// @access  Private
const getClinics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      location,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const clinics = await Company.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Company.countDocuments(query);

    res.status(200).json({
      success: true,
      count: clinics.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: clinics
    });
  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinics'
    });
  }
};

// @desc    Get single clinic
// @route   GET /api/clinics/:id
// @access  Private
const getClinic = async (req, res) => {
  try {
    const clinic = await Company.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    res.status(200).json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Get clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinic'
    });
  }
};

// @desc    Create new clinic
// @route   POST /api/clinics
// @access  Private (Owner/Admin)
const createClinic = async (req, res) => {
  try {
    const clinic = await Company.create(req.body);

    res.status(201).json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating clinic'
    });
  }
};

// @desc    Update clinic
// @route   PUT /api/clinics/:id
// @access  Private (Owner/Admin)
const updateClinic = async (req, res) => {
  try {
    const clinic = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    res.status(200).json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating clinic'
    });
  }
};

// @desc    Delete clinic
// @route   DELETE /api/clinics/:id
// @access  Private (Owner/Admin)
const deleteClinic = async (req, res) => {
  try {
    const clinic = await Company.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Soft delete
    clinic.isActive = false;
    await clinic.save();

    res.status(200).json({
      success: true,
      message: 'Clinic deleted successfully'
    });
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting clinic'
    });
  }
};

// @desc    Get clinic statistics
// @route   GET /api/clinics/statistics
// @access  Private (Owner/Admin/Accountant)
const getClinicStatistics = async (req, res) => {
  try {
    const totalClinics = await Company.countDocuments({ isActive: true });
    
    const statusStats = await Company.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$paymentInfo.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const locationStats = await Company.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalClinics,
        byStatus: statusStats,
        byLocation: locationStats
      }
    });
  } catch (error) {
    console.error('Get clinic statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinic statistics'
    });
  }
};

module.exports = {
  getClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic,
  getClinicStatistics
};
