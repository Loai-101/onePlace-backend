const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// User validation rules
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['owner', 'accountant', 'salesman', 'admin'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

// Create user validation rules (for owner creating users)
const validateCreateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .isIn(['accountant', 'salesman', 'admin'])
    .withMessage('Invalid role specified. Only accountant, salesman, or admin can be created'),
  
  body('company')
    .optional()
    .isMongoId()
    .withMessage('Company must be a valid ID'),
  
  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email or username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('sku')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters')
    .matches(/^[A-Za-z0-9\-]+$/)
    .withMessage('SKU must contain only letters, numbers, and hyphens'),
  
  body('brand')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid brand ID is required'),
  
  body('category')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('currency')
    .optional()
    .isIn(['BD', 'USD', 'EUR'])
    .withMessage('Currency must be BD, USD, or EUR'),
  
  body('stock.current')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  
  body('stock.minimum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  
  body('stock.maximum')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative integer'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'discontinued', 'out_of_stock'])
    .withMessage('Status must be active, inactive, discontinued, or out_of_stock'),
  
  body('vat.rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('VAT rate must be between 0 and 100'),
  
  handleValidationErrors
];

// Category validation rules
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  
  body('brand')
    .notEmpty()
    .isMongoId()
    .withMessage('Brand is required and must be a valid brand ID'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent must be a valid category ID'),
  
  handleValidationErrors
];

// Brand validation rules
const validateBrand = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  body('contactInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Company validation rules
const validateCompany = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  
  body('location')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  
  body('contactInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('paymentInfo.creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  
  body('paymentInfo.paymentTerms')
    .optional()
    .isIn(['cash', 'credit_30', 'credit_60', 'credit_90'])
    .withMessage('Invalid payment terms'),
  
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('orderType')
    .isIn(['invoice', 'quotation', 'proforma', 'credit'])
    .withMessage('Invalid order type'),
  
  body('customer.company')
    .isMongoId()
    .withMessage('Valid company ID is required'),
  
  body('customer.companyName')
    .trim()
    .notEmpty()
    .withMessage('Company name is required'),
  
  body('customer.employee')
    .trim()
    .notEmpty()
    .withMessage('Employee name is required'),
  
  body('customer.contactInfo.name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  
  body('customer.contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid customer email is required'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.product')
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number for each item'),
  
  body('payment.method')
    .isIn(['cash', 'visa', 'benefit', 'floos', 'credit'])
    .withMessage('Invalid payment method'),
  
  body('orderStatus')
    .optional()
    .isIn(['Normal', 'Urgent', 'Rush', 'Emergency'])
    .withMessage('Invalid order status'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID format`),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  
  query('brand')
    .optional()
    .isMongoId()
    .withMessage('Brand must be a valid ID'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateCreateUser,
  validateLogin,
  validateProduct,
  validateCategory,
  validateBrand,
  validateCompany,
  validateOrder,
  validateObjectId,
  validatePagination,
  validateSearch
};
