const Account = require('../models/Account');
const Company = require('../models/Company');
const XLSX = require('xlsx');

// Medical branches and their specializations
const MEDICAL_BRANCHES = {
  'dentistry': [
    'General Dentistry',
    'Orthodontics',
    'Oral Surgery',
    'Periodontics',
    'Endodontics',
    'Prosthodontics',
    'Pediatric Dentistry',
    'Oral Pathology',
    'Oral Medicine'
  ],
  'physiotherapy': [
    'Sports Physiotherapy',
    'Orthopedic Physiotherapy',
    'Neurological Physiotherapy',
    'Cardiopulmonary Physiotherapy',
    'Pediatric Physiotherapy',
    'Geriatric Physiotherapy',
    'Women\'s Health Physiotherapy',
    'Manual Therapy',
    'Rehabilitation'
  ],
  'orthopedics': [
    'Joint Replacement',
    'Sports Medicine',
    'Spine Surgery',
    'Hand Surgery',
    'Foot and Ankle Surgery',
    'Pediatric Orthopedics',
    'Trauma Surgery',
    'Shoulder and Elbow Surgery',
    'Musculoskeletal Oncology'
  ],
  'dermatology': [
    'Medical Dermatology',
    'Surgical Dermatology',
    'Cosmetic Dermatology',
    'Pediatric Dermatology',
    'Dermatopathology',
    'Mohs Surgery',
    'Laser Surgery',
    'Hair Disorders',
    'Nail Disorders'
  ],
  'cardiology': [
    'Interventional Cardiology',
    'Electrophysiology',
    'Heart Failure',
    'Preventive Cardiology',
    'Cardiac Imaging',
    'Pediatric Cardiology',
    'Cardiac Rehabilitation',
    'Nuclear Cardiology',
    'Echocardiography'
  ],
  'neurology': [
    'Epilepsy',
    'Stroke',
    'Movement Disorders',
    'Headache Medicine',
    'Neuromuscular Medicine',
    'Neuro-oncology',
    'Pediatric Neurology',
    'Neurocritical Care',
    'Sleep Medicine'
  ],
  'pediatrics': [
    'General Pediatrics',
    'Pediatric Cardiology',
    'Pediatric Neurology',
    'Pediatric Oncology',
    'Neonatology',
    'Pediatric Emergency Medicine',
    'Pediatric Surgery',
    'Adolescent Medicine',
    'Developmental Pediatrics'
  ],
  'gynecology': [
    'General Gynecology',
    'Gynecologic Oncology',
    'Reproductive Endocrinology',
    'Maternal-Fetal Medicine',
    'Urogynecology',
    'Minimally Invasive Surgery',
    'Family Planning',
    'Menopause Medicine',
    'Pediatric Gynecology'
  ],
  'ophthalmology': [
    'Retina',
    'Cornea',
    'Glaucoma',
    'Pediatric Ophthalmology',
    'Oculoplastics',
    'Neuro-ophthalmology',
    'Cataract Surgery',
    'Refractive Surgery',
    'Uveitis'
  ],
  'otolaryngology': [
    'Head and Neck Surgery',
    'Otology/Neurotology',
    'Rhinology',
    'Laryngology',
    'Pediatric Otolaryngology',
    'Facial Plastic Surgery',
    'Sleep Medicine',
    'Thyroid Surgery',
    'Skull Base Surgery'
  ],
  'psychiatry': [
    'General Psychiatry',
    'Child and Adolescent Psychiatry',
    'Geriatric Psychiatry',
    'Addiction Psychiatry',
    'Forensic Psychiatry',
    'Psychosomatic Medicine',
    'Emergency Psychiatry',
    'Consultation-Liaison Psychiatry',
    'Neuropsychiatry'
  ],
  'radiology': [
    'Diagnostic Radiology',
    'Interventional Radiology',
    'Nuclear Medicine',
    'Pediatric Radiology',
    'Neuroradiology',
    'Musculoskeletal Radiology',
    'Breast Imaging',
    'Cardiothoracic Radiology',
    'Abdominal Imaging'
  ],
  'surgery': [
    'General Surgery',
    'Cardiothoracic Surgery',
    'Neurosurgery',
    'Plastic Surgery',
    'Vascular Surgery',
    'Transplant Surgery',
    'Trauma Surgery',
    'Minimally Invasive Surgery',
    'Surgical Oncology'
  ],
  'internal-medicine': [
    'General Internal Medicine',
    'Cardiology',
    'Endocrinology',
    'Gastroenterology',
    'Hematology',
    'Infectious Disease',
    'Nephrology',
    'Pulmonology',
    'Rheumatology'
  ],
  'emergency-medicine': [
    'General Emergency Medicine',
    'Pediatric Emergency Medicine',
    'Toxicology',
    'Sports Medicine',
    'Wilderness Medicine',
    'Disaster Medicine',
    'Emergency Medical Services',
    'Critical Care',
    'Ultrasound'
  ],
  'other': []
};

// @desc    Get all specializations for a medical branch
// @route   GET /api/accounts/specializations/:branch
// @access  Private
const getSpecializations = async (req, res) => {
  try {
    const { branch } = req.params;
    
    if (!MEDICAL_BRANCHES[branch]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medical branch'
      });
    }

    res.status(200).json({
      success: true,
      data: MEDICAL_BRANCHES[branch]
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching specializations'
    });
  }
};

// @desc    Get all medical branches
// @route   GET /api/accounts/branches
// @access  Private
const getMedicalBranches = async (req, res) => {
  try {
    const branches = Object.keys(MEDICAL_BRANCHES).map(key => ({
      value: key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ')
    }));

    res.status(200).json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Get medical branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical branches'
    });
  }
};

// @desc    Get all accounts for a company
// @route   GET /api/accounts
// @access  Private (Owner/Admin/Salesman/Accountant)
const getAccounts = async (req, res) => {
  try {
    let query = {};
    
    // Filter by user's company for all roles
    if (!req.user.company) {
      return res.status(404).json({
        success: false,
        message: 'User is not associated with a company'
      });
    }
    query.company = req.user.company;

    // Filter by status if provided
    if (req.query.status) {
      if (req.query.status === 'active') {
        query.isActive = true;
      } else if (req.query.status === 'inactive') {
        query.isActive = false;
      }
    }

    const accounts = await Account.find(query)
      .populate('company', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accounts'
    });
  }
};

// @desc    Get single account
// @route   GET /api/accounts/:id
// @access  Private (Owner/Admin)
const getAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('company', 'name email');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user has access to this account's company (all roles)
    if (account.company._id.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access accounts from your company.'
      });
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account'
    });
  }
};

// @desc    Create new account
// @route   POST /api/accounts
// @access  Private (Owner/Admin)
const createAccount = async (req, res) => {
  try {
    // Verify company exists
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Validate staff and their medical branches
    if (!req.body.staff || !Array.isArray(req.body.staff) || req.body.staff.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one staff member is required'
      });
    }

    // Validate each staff member's medical branch
    for (let i = 0; i < req.body.staff.length; i++) {
      const staffMember = req.body.staff[i];
      if (!staffMember.medicalBranch) {
        return res.status(400).json({
          success: false,
          message: `Medical branch is required for staff member ${i + 1}`
        });
      }
      if (!MEDICAL_BRANCHES[staffMember.medicalBranch]) {
        return res.status(400).json({
          success: false,
          message: `Invalid medical branch "${staffMember.medicalBranch}" for staff member ${i + 1}`
        });
      }
    }

    const accountData = {
      ...req.body,
      company: req.user.company
    };

    const account = await Account.create(accountData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account
    });
  } catch (error) {
    console.error('Create account error:', error);
    
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
      message: 'Error creating account'
    });
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private (Owner/Admin)
const updateAccount = async (req, res) => {
  try {
    let account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user has access to this account's company
    if (account.company.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate staff and their medical branches if provided
    if (req.body.staff) {
      if (!Array.isArray(req.body.staff) || req.body.staff.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one staff member is required'
        });
      }

      // Validate each staff member's medical branch
      for (let i = 0; i < req.body.staff.length; i++) {
        const staffMember = req.body.staff[i];
        if (!staffMember.medicalBranch) {
          return res.status(400).json({
            success: false,
            message: `Medical branch is required for staff member ${i + 1}`
          });
        }
        if (!MEDICAL_BRANCHES[staffMember.medicalBranch]) {
          return res.status(400).json({
            success: false,
            message: `Invalid medical branch "${staffMember.medicalBranch}" for staff member ${i + 1}`
          });
        }
      }
    }

    account = await Account.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('company', 'name email');

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Update account error:', error);
    
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
      message: 'Error updating account'
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Private (Owner/Admin)
const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user has access to this account's company
    if (account.company.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Account.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};

// @desc    Toggle account active status
// @route   PATCH /api/accounts/:id/toggle-status
// @access  Private (Owner/Admin)
const toggleAccountStatus = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user has access to this account's company
    if (account.company.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    account.isActive = !account.isActive;
    await account.save();

    res.status(200).json({
      success: true,
      message: `Account ${account.isActive ? 'activated' : 'deactivated'} successfully`,
      data: account
    });
  } catch (error) {
    console.error('Toggle account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling account status'
    });
  }
};

// @desc    Bulk import accounts from Excel
// @route   POST /api/accounts/bulk-import
// @access  Private (Owner/Admin)
const bulkImportAccounts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Get user's company
    const company = req.user.company;
    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with a company'
      });
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields
        const requiredFields = {
          'Name': row['Name'],
          'Phone Number': row['Phone Number'],
          'Area': row['Area'],
          'Flat/Shop No.': row['Flat/Shop No.'],
          'Building': row['Building'],
          'Road': row['Road'],
          'Block': row['Block'],
          'VAT Number': row['VAT Number'],
          'CR Number': row['CR Number'],
          'Credit Limit': row['Credit Limit'],
          'Status': row['Status']
        };

        const missingFields = Object.keys(requiredFields).filter(field => {
          const value = requiredFields[field];
          return value === undefined || value === null || String(value).trim() === '';
        });

        if (missingFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: row['Name'] || 'N/A',
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Parse staff (optional - can be added manually later)
        let staff = [];
        if (row['Staff'] && String(row['Staff']).trim()) {
          try {
            // Try parsing as JSON first
            if (typeof row['Staff'] === 'string' && row['Staff'].startsWith('[')) {
              staff = JSON.parse(row['Staff']);
            } else {
              // Otherwise, treat as single staff member or semicolon-separated multiple
              // Format: Title|Name|Phone|Email|MedicalBranch|Specializations
              const staffEntries = String(row['Staff']).split(';');
              staff = staffEntries.map(entry => {
                const staffParts = entry.trim().split('|');
                return {
                  title: staffParts[0]?.trim() || 'Dr',
                  name: staffParts[1]?.trim() || '',
                  phone: staffParts[2]?.trim() || '',
                  email: staffParts[3]?.trim() || '', // Optional email
                  medicalBranch: staffParts[4]?.trim() || '',
                  specializations: staffParts[5] ? staffParts[5].split(',').map(s => s.trim()).filter(Boolean) : []
                };
              }).filter(s => s.name || s.medicalBranch); // Only include if has name or branch
            }
          } catch (e) {
            // If parsing fails, skip staff (it's optional)
            staff = [];
          }
        }

        // Validate medical branches for each staff member (if provided)
        for (let j = 0; j < staff.length; j++) {
          const staffMember = staff[j];
          if (staffMember.medicalBranch && !MEDICAL_BRANCHES[staffMember.medicalBranch]) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              name: row['Name'] || 'N/A',
              error: `Invalid medical branch "${staffMember.medicalBranch}" for staff member ${j + 1}`
            });
            continue;
          }
        }

        // If no staff provided, leave empty (can be added manually later)
        if (!staff || staff.length === 0) {
          staff = [];
        }

        // Create account data
        const accountData = {
          company: company,
          name: row['Name'].trim(),
          phone: row['Phone Number'].trim(),
          email: row['Email'] ? row['Email'].trim() : undefined, // Optional email field
          address: {
            flatShopNo: row['Flat/Shop No.'].trim(),
            building: row['Building'].trim(),
            road: row['Road'].trim(),
            block: row['Block'].trim(),
            area: row['Area'].trim()
          },
          staff: staff, // Optional - can be empty array
          vat: row['VAT Number'].trim(),
          crNumber: row['CR Number'].trim(),
          creditLimit: parseFloat(row['Credit Limit']) || 0,
          isActive: row['Status']?.toLowerCase() !== 'inactive',
          // Logo is optional - must be added manually on platform
          logo: {
            url: '',
            public_id: ''
          }
        };

        // Check for duplicate name within company
        const existingAccount = await Account.findOne({
          company: company,
          name: accountData.name
        });

        if (existingAccount) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: accountData.name,
            error: 'Account with this name already exists'
          });
          continue;
        }

        // Create account
        const account = await Account.create(accountData);
        results.success++;

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          name: row['Name'] || 'N/A',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk import accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing accounts',
      error: error.message
    });
  }
};

module.exports = {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountStatus,
  getMedicalBranches,
  getSpecializations,
  bulkImportAccounts
};

