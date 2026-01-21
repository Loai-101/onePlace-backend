const express = require('express');
const {
  getBrands,
  getFeaturedBrands,
  getBrandsWithCounts,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  updateBrandProductCount
} = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const { validateBrand, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication (brands are company-specific)
router.use(protect);

// Public authenticated routes (all users with company can access) - STRICT COMPANY ISOLATION
router.get('/', enforceCompanyContext, getBrands);
router.get('/featured', enforceCompanyContext, getFeaturedBrands);
router.get('/with-counts', enforceCompanyContext, getBrandsWithCounts);
router.get('/:id', enforceCompanyContext, validateObjectId('id'), getBrand);
router.get('/:id/products', enforceCompanyContext, validateObjectId('id'), validatePagination, getBrandProducts);

// Owner/Admin only routes - STRICT COMPANY ISOLATION
router.post('/', enforceCompanyContext, authorize('owner', 'admin'), validateBrand, createBrand);
router.put('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateBrand);
router.delete('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), deleteBrand);
router.patch('/:id/update-count', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateBrandProductCount);

module.exports = router;
