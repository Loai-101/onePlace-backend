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
const { validateBrand, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication (brands are company-specific)
router.use(protect);

// Public authenticated routes (all users with company can access)
router.get('/', getBrands);
router.get('/featured', getFeaturedBrands);
router.get('/with-counts', getBrandsWithCounts);
router.get('/:id', validateObjectId('id'), getBrand);
router.get('/:id/products', validateObjectId('id'), validatePagination, getBrandProducts);

// Owner/Admin only routes
router.post('/', authorize('owner', 'admin'), validateBrand, createBrand);
router.put('/:id', authorize('owner', 'admin'), validateObjectId('id'), updateBrand);
router.delete('/:id', authorize('owner', 'admin'), validateObjectId('id'), deleteBrand);
router.patch('/:id/update-count', authorize('owner', 'admin'), validateObjectId('id'), updateBrandProductCount);

module.exports = router;
