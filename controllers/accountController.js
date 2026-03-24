const Account = require('../models/Account');
const Company = require('../models/Company');
const XLSX = require('xlsx');
const { 
  validateCompanyOwnership, 
  buildCompanyQuery 
} = require('../middleware/companyIsolation');

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

/**
 * Same rules as POST /api/accounts — import must produce accounts the UI could create.
 */
function validateStaffForAccount(staff) {
  if (!staff || !Array.isArray(staff) || staff.length === 0) {
    return { ok: false, message: 'At least one staff member is required' };
  }
  for (let i = 0; i < staff.length; i++) {
    const staffMember = staff[i];
    if (!staffMember.medicalBranch) {
      return { ok: false, message: `Medical branch is required for staff member ${i + 1}` };
    }
    if (!MEDICAL_BRANCHES[staffMember.medicalBranch]) {
      return {
        ok: false,
        message: `Invalid medical branch "${staffMember.medicalBranch}" for staff member ${i + 1}`
      };
    }
    if (!staffMember.title || !['Dr', 'Miss', 'Mr'].includes(staffMember.title)) {
      return {
        ok: false,
        message: `Staff title must be Dr, Miss, or Mr for staff member ${i + 1}`
      };
    }
  }
  return { ok: true };
}

/** Match Excel headers despite BOM, NBSP, extra spaces, and "Flat / Shop" vs "Flat/Shop". */
function normalizeHeaderKey(key) {
  return String(key ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/');
}

function rowToNorm(row) {
  const norm = {};
  for (const key of Object.keys(row)) {
    norm[normalizeHeaderKey(key)] = row[key];
  }
  return norm;
}

function getCell(norm, ...aliases) {
  for (const a of aliases) {
    const k = normalizeHeaderKey(a);
    const v = norm[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

/** Map one address line into schema fields (max lengths per Account model). */
function distributeAddressLineIntoSchemaFields(addressLine) {
  const empty = { flatShopNo: '', building: '', road: '', block: '' };
  const s = String(addressLine == null ? '' : addressLine).trim();
  if (!s) {
    return { ...empty };
  }
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { ...empty };
  }
  if (parts.length === 1) {
    return {
      flatShopNo: parts[0].slice(0, 100),
      building: '',
      road: '',
      block: ''
    };
  }
  if (parts.length === 2) {
    return {
      flatShopNo: parts[0].slice(0, 100),
      building: parts[1].slice(0, 200),
      road: '',
      block: ''
    };
  }
  if (parts.length === 3) {
    return {
      flatShopNo: parts[0].slice(0, 100),
      building: parts[1].slice(0, 200),
      road: parts[2].slice(0, 200),
      block: ''
    };
  }
  return {
    flatShopNo: parts[0].slice(0, 100),
    building: parts[1].slice(0, 200),
    road: parts[2].slice(0, 200),
    block: parts.slice(3).join(', ').slice(0, 50)
  };
}

/**
 * Bulk import: read Address (or legacy columns) + Area + business fields; staff/logo added later in the app.
 */
function buildAddressFromImportRow(norm) {
  let line = getCell(
    norm,
    'address',
    'street address',
    'full address',
    'location',
    'addr',
    'street',
    'company address',
    'physical address',
    'address line 1',
    'address line1',
    'address 1'
  );
  if (!line) {
    const legacy = [
      getCell(
        norm,
        'flat/shop no.',
        'flat shop no.',
        'flat/shop no',
        'flat shop no',
        'shop no.',
        'shop no',
        'flat no',
        'unit',
        'unit no',
        'unit no.',
        'flat'
      ),
      getCell(norm, 'building', 'bldg', 'building name'),
      getCell(norm, 'road', 'street name', 'st'),
      getCell(norm, 'block', 'blk')
    ].filter(Boolean);
    if (legacy.length) line = legacy.join(', ');
  }
  return distributeAddressLineIntoSchemaFields(line);
}

/**
 * Build row objects from sheet: supports a title row above the real header row,
 * and normalizes headers the same way as rowToNorm (fixes "Address" not mapping).
 */
function rowArrayToObject(headerRow, dataRow) {
  const obj = {};
  const hdr = headerRow || [];
  const dat = dataRow || [];
  for (let c = 0; c < hdr.length; c++) {
    const h = normalizeHeaderKey(String(hdr[c] ?? ''));
    if (!h) continue;
    const v = dat[c];
    obj[h] = v === undefined || v === null ? '' : v;
  }
  return obj;
}

function rowLooksLikeAccountData(row) {
  const n = rowToNorm(row);
  return !!(
    getCell(n, 'name') ||
    getCell(n, 'phone number', 'phone') ||
    getCell(n, 'area') ||
    getCell(n, 'vat number', 'vat') ||
    getCell(n, 'address', 'addr', 'street')
  );
}

function parseAccountSheet(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  if (!rows || !rows.length) return [];

  const objectsFromHeaderRow = (headerIndex) => {
    const headerRow = rows[headerIndex];
    if (!headerRow || !headerRow.length) return [];
    const out = [];
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const dataRow = rows[r] || [];
      const hasAny = dataRow.some(
        (cell) => cell !== '' && cell != null && String(cell).trim() !== ''
      );
      if (!hasAny) continue;
      out.push(rowArrayToObject(headerRow, dataRow));
    }
    return out;
  };

  let data = objectsFromHeaderRow(0);
  const ok0 = data.some(rowLooksLikeAccountData);
  if (data.length && !ok0) {
    const alt = objectsFromHeaderRow(1);
    if (alt.some(rowLooksLikeAccountData)) {
      data = alt;
    }
  }
  return data;
}

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
// @isolation STRICT - Only returns accounts for user's company
const getAccounts = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Build company-scoped query - CRITICAL for data isolation
    const companyId = req.user.company._id || req.user.company;
    let query = buildCompanyQuery({}, companyId);

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
// @isolation STRICT - Verifies account belongs to user's company
const getAccount = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const account = await Account.findOne({
      _id: req.params.id,
      company: companyId
    }).populate('company', 'name email');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(account, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This account belongs to a different company.'
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
// @isolation STRICT - Forces account to be created for user's company only
const createAccount = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;

    // Verify company exists and is active
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your company account is inactive. Please contact your administrator.'
      });
    }

    const staffCheck = validateStaffForAccount(req.body.staff);
    if (!staffCheck.ok) {
      return res.status(400).json({
        success: false,
        message: staffCheck.message
      });
    }

    // CRITICAL: Force company to user's company (prevent cross-company creation)
    // Override any company field in request body
    const accountData = {
      ...req.body,
      company: companyId  // Always use authenticated user's company
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
// @isolation STRICT - Verifies account belongs to user's company before update
const updateAccount = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    let account = await Account.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(account, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This account belongs to a different company.'
      });
    }

    // CRITICAL: Prevent company field from being changed
    if (req.body.company && req.body.company.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot change account company.'
      });
    }

    // Ensure company remains set to user's company
    req.body.company = companyId;

    if (req.body.staff) {
      const staffCheck = validateStaffForAccount(req.body.staff);
      if (!staffCheck.ok) {
        return res.status(400).json({
          success: false,
          message: staffCheck.message
        });
      }
    }

    // Update with company filter to prevent cross-company updates
    account = await Account.findOneAndUpdate(
      {
        _id: req.params.id,
        company: companyId
      },
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
// @isolation STRICT - Verifies account belongs to user's company before deletion
const deleteAccount = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const account = await Account.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(account, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This account belongs to a different company.'
      });
    }

    // Delete with company filter to prevent cross-company deletion
    await Account.findOneAndDelete({
      _id: req.params.id,
      company: companyId
    });

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
// @isolation STRICT - Verifies account belongs to user's company
const toggleAccountStatus = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const account = await Account.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(account, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This account belongs to a different company.'
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

    // Parse Excel file (header-aware: title row + real headers, normalized "Address" column)
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = parseAccountSheet(worksheet);

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

    if (!req.user.company) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with a company'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    const companyDoc = await Company.findById(companyId);
    if (!companyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    if (!companyDoc.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your company account is inactive. Please contact your administrator.'
      });
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;
      const norm = rowToNorm(row);

      try {
        const name = getCell(norm, 'name');
        const phone = getCell(norm, 'phone number', 'phone');
        const area = getCell(norm, 'area');
        const vat = getCell(norm, 'vat number', 'vat');
        const crNumber = getCell(norm, 'cr number', 'cr');
        const creditRaw = getCell(norm, 'credit limit', 'creditlimit');
        const statusRaw = getCell(norm, 'status') || 'active';
        const emailRaw = getCell(norm, 'email');

        const addressParts = buildAddressFromImportRow(norm);

        const missingLabels = [];
        if (!name) missingLabels.push('Name');
        if (!phone) missingLabels.push('Phone Number');
        if (!area) missingLabels.push('Area');
        // Address is optional on import — admins can complete flat/building/road/block in the app
        if (!vat) missingLabels.push('VAT Number');
        if (!crNumber) missingLabels.push('CR Number');
        if (creditRaw === '') missingLabels.push('Credit Limit');

        if (missingLabels.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: name || 'N/A',
            error: `Missing required fields: ${missingLabels.join(', ')}`
          });
          continue;
        }

        const creditLimit = parseFloat(String(creditRaw).replace(/,/g, ''), 10);
        if (Number.isNaN(creditLimit) || creditLimit < 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: name || 'N/A',
            error: 'Credit Limit must be a number ≥ 0'
          });
          continue;
        }

        let email = emailRaw || undefined;
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
          email = undefined;
        }

        const accountData = {
          company: companyId,
          name,
          phone,
          ...(email ? { email } : {}),
          address: {
            ...addressParts,
            area
          },
          staff: [],
          vat,
          crNumber,
          creditLimit,
          isActive: String(statusRaw).toLowerCase().trim() !== 'inactive',
          logo: {
            url: '',
            public_id: ''
          }
        };

        const existingAccount = await Account.findOne(
          buildCompanyQuery({ name: accountData.name }, companyId)
        );

        if (existingAccount) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: accountData.name,
            error: 'Account with this name already exists'
          });
          continue;
        }

        await Account.create(accountData);
        results.success++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          name: getCell(rowToNorm(row), 'name') || 'N/A',
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

