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

function rowToNorm(row) {
  const norm = {};
  for (const key of Object.keys(row)) {
    norm[String(key).trim().toLowerCase()] = row[key];
  }
  return norm;
}

function getCell(norm, ...aliases) {
  for (const a of aliases) {
    const v = norm[a.trim().toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

function normalizeStaffTitle(input) {
  if (input === undefined || input === null || String(input).trim() === '') {
    return 'Dr';
  }
  const s = String(input).trim();
  const l = s.toLowerCase();
  if (l === 'dr' || l === 'dr.') return 'Dr';
  if (l === 'mr' || l === 'mr.') return 'Mr';
  if (l === 'miss' || l === 'ms' || l === 'ms.') return 'Miss';
  if (['Dr', 'Mr', 'Miss'].includes(s)) return s;
  return s;
}

function resolveMedicalBranchKey(raw) {
  if (!raw || !String(raw).trim()) return null;
  const t = String(raw).trim();
  const lower = t.toLowerCase();
  if (MEDICAL_BRANCHES[lower]) return lower;
  const asSlug = lower.replace(/\s+/g, '-');
  if (MEDICAL_BRANCHES[asSlug]) return asSlug;
  const byKey = Object.keys(MEDICAL_BRANCHES).find((k) => k.toLowerCase() === lower);
  if (byKey) return byKey;
  const flat = lower.replace(/-/g, ' ');
  const byLabel = Object.keys(MEDICAL_BRANCHES).find(
    (k) => k.replace(/-/g, ' ').toLowerCase() === flat
  );
  return byLabel || null;
}

const IMPORT_STAFF_SLOT_COUNT = 5;

function parseStaffFromImportRow(norm) {
  const fromSlots = [];

  for (let n = 1; n <= IMPORT_STAFF_SLOT_COUNT; n++) {
    const titleRaw = getCell(norm, `Staff ${n} Title`, `Staff${n} Title`, `Staff_${n}_Title`);
    const title = normalizeStaffTitle(titleRaw);
    const name = getCell(norm, `Staff ${n} Name`, `Staff${n} Name`, `Staff_${n}_Name`);
    const phone = getCell(norm, `Staff ${n} Phone`, `Staff${n} Phone`, `Staff_${n}_Phone`);
    const emailRaw = getCell(norm, `Staff ${n} Email`, `Staff${n} Email`, `Staff_${n}_Email`);
    const branchRaw = getCell(
      norm,
      `Staff ${n} Medical Branch`,
      `Staff ${n} MedicalBranch`,
      `Staff${n} Medical Branch`,
      `Staff${n} MedicalBranch`,
      `Staff_${n}_Medical_Branch`
    );
    const specsRaw = getCell(
      norm,
      `Staff ${n} Specializations`,
      `Staff${n} Specializations`,
      `Staff_${n}_Specializations`
    );

    const hasSlotData = !!(branchRaw || name || phone || emailRaw || specsRaw || titleRaw);
    if (!hasSlotData) continue;

    const branchKey = resolveMedicalBranchKey(branchRaw);
    const specializations = specsRaw
      ? specsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let email = emailRaw || undefined;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      email = undefined;
    }

    fromSlots.push({
      title,
      name: name || '',
      phone: phone || '',
      email,
      medicalBranch: branchKey || (branchRaw ? branchRaw.trim().toLowerCase().replace(/\s+/g, '-') : ''),
      specializations
    });
  }

  if (fromSlots.length > 0) {
    return fromSlots;
  }

  const legacy = getCell(norm, 'Staff');
  const fromLegacy = [];
  if (!legacy) return fromLegacy;

  try {
    if (typeof legacy === 'string' && legacy.trim().startsWith('[')) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && typeof item === 'object') {
            const brRaw = item.medicalBranch != null ? String(item.medicalBranch).trim() : '';
            const br = resolveMedicalBranchKey(brRaw) || brRaw.toLowerCase().replace(/\s+/g, '-');
            fromLegacy.push({
              title: normalizeStaffTitle(item.title),
              name: (item.name && String(item.name).trim()) || '',
              phone: (item.phone && String(item.phone).trim()) || '',
              email:
                item.email && /^\S+@\S+\.\S+$/.test(String(item.email))
                  ? String(item.email).trim()
                  : undefined,
              medicalBranch: br,
              specializations: Array.isArray(item.specializations) ? item.specializations.map(String) : []
            });
          }
        });
      }
    } else {
      const staffEntries = String(legacy).split(';');
      for (const entry of staffEntries) {
        const staffParts = entry.trim().split('|');
        const title = normalizeStaffTitle(staffParts[0]);
        const name = (staffParts[1] && staffParts[1].trim()) || '';
        const phone = (staffParts[2] && staffParts[2].trim()) || '';
        let email = (staffParts[3] && staffParts[3].trim()) || undefined;
        if (email && !/^\S+@\S+\.\S+$/.test(email)) email = undefined;
        const branchRaw = (staffParts[4] && staffParts[4].trim()) || '';
        const branchKey =
          resolveMedicalBranchKey(branchRaw) ||
          (branchRaw ? branchRaw.toLowerCase().replace(/\s+/g, '-') : '');
        const specs =
          staffParts[5] ? staffParts[5].split(',').map((s) => s.trim()).filter(Boolean) : [];
        if (!name && !branchRaw) continue;
        fromLegacy.push({
          title,
          name,
          phone,
          email,
          medicalBranch: branchKey,
          specializations: specs
        });
      }
    }
  } catch (e) {
    // validation will surface empty/invalid staff
  }

  return fromLegacy;
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
        const flatShopNo = getCell(norm, 'flat/shop no.', 'flat shop no.');
        const building = getCell(norm, 'building');
        const road = getCell(norm, 'road');
        const block = getCell(norm, 'block');
        const vat = getCell(norm, 'vat number', 'vat');
        const crNumber = getCell(norm, 'cr number', 'cr');
        const creditRaw = getCell(norm, 'credit limit', 'creditlimit');
        const statusRaw = getCell(norm, 'status') || 'active';
        const emailRaw = getCell(norm, 'email');

        const missingLabels = [];
        if (!name) missingLabels.push('Name');
        if (!phone) missingLabels.push('Phone Number');
        if (!area) missingLabels.push('Area');
        if (!flatShopNo) missingLabels.push('Flat/Shop No.');
        if (!building) missingLabels.push('Building');
        if (!road) missingLabels.push('Road');
        if (!block) missingLabels.push('Block');
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

        const creditLimit = parseFloat(creditRaw, 10);
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

        const staff = parseStaffFromImportRow(norm);
        const staffCheck = validateStaffForAccount(staff);
        if (!staffCheck.ok) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: name || 'N/A',
            error: staffCheck.message
          });
          continue;
        }

        const accountData = {
          company: companyId,
          name,
          phone,
          email,
          address: {
            flatShopNo,
            building,
            road,
            block,
            area
          },
          staff,
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

