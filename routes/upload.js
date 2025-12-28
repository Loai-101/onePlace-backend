const express = require('express');
const { uploadImageToSupabase, uploadPdfToSupabase, uploadSingle, uploadPdfSingle } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Upload image route - Protected, Owner/Admin only
router.post('/image', protect, authorize('owner', 'admin'), uploadSingle, uploadImageToSupabase);

// Upload PDF route - Protected, Accountant/Owner/Admin only
router.post('/pdf', protect, authorize('accountant', 'owner', 'admin'), uploadPdfSingle, uploadPdfToSupabase);

module.exports = router;

