/**
 * STRICT MULTI-TENANT ISOLATION MIDDLEWARE
 * 
 * This middleware enforces company-level data isolation at the backend level.
 * It ensures that:
 * 1. Every user MUST be associated with a company
 * 2. All queries are automatically scoped to the user's company
 * 3. Cross-company access is impossible
 * 4. No fallback or default company is allowed
 */

const Company = require('../models/Company');

/**
 * Middleware to enforce company context
 * MUST be used after protect() middleware
 */
const enforceCompanyContext = (req, res, next) => {
  // Check if user is authenticated (should be set by protect middleware)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login first.'
    });
  }

  // CRITICAL: User MUST have a company
  if (!req.user.company) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User must be associated with a company. Please contact your administrator.'
    });
  }

  // Set company context on request object for use in controllers
  req.companyId = req.user.company._id || req.user.company;
  req.companyContext = {
    id: req.companyId,
    name: req.user.company?.name || 'Unknown'
  };

  next();
};

/**
 * Helper function to validate that a resource belongs to the user's company
 * Use this in controllers before returning/updating/deleting resources
 */
const validateCompanyOwnership = (resource, userCompanyId) => {
  if (!resource) {
    return { valid: false, error: 'Resource not found' };
  }

  const resourceCompanyId = resource.company?._id?.toString() || resource.company?.toString() || resource.company;
  const userCompanyIdStr = userCompanyId?._id?.toString() || userCompanyId?.toString() || userCompanyId;

  if (!resourceCompanyId || !userCompanyIdStr) {
    return { valid: false, error: 'Company information missing' };
  }

  if (resourceCompanyId !== userCompanyIdStr) {
    return { 
      valid: false, 
      error: 'Access denied. This resource belongs to a different company.' 
    };
  }

  return { valid: true };
};

/**
 * Helper function to build company-scoped query
 * Use this in all find() queries to ensure company isolation
 */
const buildCompanyQuery = (baseQuery, companyId) => {
  if (!companyId) {
    throw new Error('Company ID is required for query isolation');
  }

  const companyIdStr = companyId._id?.toString() || companyId.toString() || companyId;

  return {
    ...baseQuery,
    company: companyIdStr
  };
};

/**
 * Helper function to validate company ID in request body/params
 * Prevents users from creating/updating resources for other companies
 */
const validateCompanyInRequest = (req, res, next) => {
  const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();

  // If company is specified in body, it MUST match user's company
  if (req.body.company) {
    const bodyCompanyId = req.body.company._id?.toString() || req.body.company.toString();
    
    if (bodyCompanyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only create resources for your own company.'
      });
    }
  }

  // Always set company to user's company (override any user input)
  req.body.company = req.user.company;

  next();
};

/**
 * Middleware to verify company exists and is active
 */
const verifyCompanyActive = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'User must be associated with a company'
      });
    }

    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found. Please contact your administrator.'
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your company account is inactive. Please contact your administrator.'
      });
    }

    req.company = company;
    next();
  } catch (error) {
    console.error('Company verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying company status'
    });
  }
};

module.exports = {
  enforceCompanyContext,
  validateCompanyOwnership,
  buildCompanyQuery,
  validateCompanyInRequest,
  verifyCompanyActive
};
