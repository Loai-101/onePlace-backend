const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|String} file - File buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadImage = async (file, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'brands',
      resource_type: 'image',
      ...options
    };

    // If file is a buffer (from multer), use upload_stream
    if (Buffer.isBuffer(file)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height
              });
            }
          }
        );
        uploadStream.end(file);
      });
    } else {
      // If file is a path or URL
      const result = await cloudinary.uploader.upload(file, uploadOptions);
      return {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height
      };
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload PDF to Cloudinary
 * @param {Buffer|String} file - File buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadPdf = async (file, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'invoices',
      resource_type: 'raw',
      ...options
    };

    // If file is a buffer (from multer), use upload_stream
    if (Buffer.isBuffer(file)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id
              });
            }
          }
        );
        uploadStream.end(file);
      });
    } else {
      // If file is a path or URL
      const result = await cloudinary.uploader.upload(file, uploadOptions);
      return {
        url: result.secure_url,
        public_id: result.public_id
      };
    }
  } catch (error) {
    console.error('Cloudinary PDF upload error:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

module.exports = {
  uploadImage,
  uploadPdf,
  deleteImage,
  cloudinary
};

