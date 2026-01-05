const Account = require('../models/Account');
const Company = require('../models/Company');
const XLSX = require('xlsx');

// @desc    Get marketing dashboard data
// @route   GET /api/marketing/dashboard
// @access  Private (Owner/Admin)
const getMarketingDashboard = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get all accounts for the company
    const accounts = await Account.find({ 
      company: companyId,
      isActive: true 
    }).populate('company', 'name');

    // Aggregate data by account type
    const accountTypeStats = {};
    let totalStaff = 0;
    const staffList = [];

    accounts.forEach(account => {
      // Count account type (we'll use account name as type identifier)
      const accountType = account.name || 'Unknown';
      if (!accountTypeStats[accountType]) {
        accountTypeStats[accountType] = {
          count: 0,
          staffCount: 0
        };
      }
      accountTypeStats[accountType].count += 1;

      // Process staff
      if (account.staff && Array.isArray(account.staff)) {
        account.staff.forEach(staff => {
          totalStaff += 1;
          accountTypeStats[accountType].staffCount += 1;

          // Add to staff list
          staffList.push({
            name: `${staff.title || ''} ${staff.name || 'N/A'}`.trim(),
            phone: staff.phone || 'N/A',
            email: staff.email || 'N/A',
            company: account.name || 'N/A',
            area: account.address?.area || 'N/A',
            accountType: accountType,
            medicalBranch: staff.medicalBranch || 'N/A',
            specializations: staff.specializations?.join(', ') || 'N/A'
          });
        });
      }
    });

    // Convert accountTypeStats to array format
    const accountTypeBreakdown = Object.entries(accountTypeStats).map(([type, stats]) => ({
      type,
      accountCount: stats.count,
      staffCount: stats.staffCount
    }));

    res.status(200).json({
      success: true,
      data: {
        totalAccounts: accounts.length,
        totalStaff,
        accountTypeBreakdown,
        staffList
      }
    });
  } catch (error) {
    console.error('Get marketing dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching marketing dashboard data'
    });
  }
};

// @desc    Download marketing staff data as Excel
// @route   GET /api/marketing/download
// @access  Private (Owner/Admin)
const downloadMarketingData = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get all accounts for the company
    const accounts = await Account.find({ 
      company: companyId,
      isActive: true 
    }).populate('company', 'name');

    // Prepare data for Excel
    const excelData = [];

    accounts.forEach(account => {
      if (account.staff && Array.isArray(account.staff) && account.staff.length > 0) {
        account.staff.forEach(staff => {
          excelData.push({
            'Staff Name': `${staff.title || ''} ${staff.name || 'N/A'}`.trim(),
            'Phone Number': staff.phone || 'N/A',
            'Email': staff.email || 'N/A',
            'Company': account.name || 'N/A',
            'Area': account.address?.area || 'N/A',
            'Account Type': account.name || 'N/A',
            'Medical Branch': staff.medicalBranch || 'N/A',
            'Specializations': staff.specializations?.join(', ') || 'N/A'
          });
        });
      } else {
        // Include account even if no staff
        excelData.push({
          'Staff Name': 'N/A',
          'Phone Number': account.phone || 'N/A',
          'Email': account.email || 'N/A',
          'Company': account.name || 'N/A',
          'Area': account.address?.area || 'N/A',
          'Account Type': account.name || 'N/A',
          'Medical Branch': 'N/A',
          'Specializations': 'N/A'
        });
      }
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Data');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Set response headers
    const fileName = `marketing-data-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Download marketing data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading marketing data'
    });
  }
};

module.exports = {
  getMarketingDashboard,
  downloadMarketingData
};

