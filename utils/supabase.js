const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key (for server-side operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

/**
 * Ensure storage bucket exists, create if it doesn't
 * @param {String} bucketName - Bucket name
 * @param {Boolean} isPublic - Whether bucket should be public
 * @returns {Promise<Boolean>} True if bucket exists or was created
 */
const ensureBucketExists = async (bucketName, isPublic = true) => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      return true;
    }

    // Create bucket if it doesn't exist
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: null // Allow all types
    });

    if (error) {
      console.error(`Error creating bucket "${bucketName}":`, error);
      return false;
    }

    console.log(`Bucket "${bucketName}" created successfully`);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket "${bucketName}" exists:`, error);
    return false;
  }
};

// Initialize buckets on module load
(async () => {
  try {
    await ensureBucketExists('images', true);
    await ensureBucketExists('invoices', true);
  } catch (error) {
    console.error('Error initializing buckets:', error);
  }
})();

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - File name
 * @param {String} bucket - Storage bucket name
 * @param {String} folder - Folder path within bucket
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadFile = async (fileBuffer, fileName, bucket, folder = '', contentType = 'application/pdf') => {
  try {
    // Ensure bucket exists before uploading
    const bucketExists = await ensureBucketExists(bucket, true);
    if (!bucketExists) {
      throw new Error(`Failed to ensure bucket "${bucket}" exists`);
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload PDF to Supabase Storage
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {String} fileName - PDF file name
 * @param {String} folder - Folder path (default: 'invoices')
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadPdf = async (fileBuffer, fileName, folder = 'invoices') => {
  return await uploadFile(fileBuffer, fileName, 'invoices', folder);
};

/**
 * Upload image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} fileName - Image file name
 * @param {String} folder - Folder path (default: 'brands')
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadImage = async (fileBuffer, fileName, folder = 'brands') => {
  // Detect content type from file extension
  const extension = fileName.split('.').pop().toLowerCase();
  const contentTypeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  const contentType = contentTypeMap[extension] || 'image/jpeg';
  
  return await uploadFile(fileBuffer, fileName, 'images', folder, contentType);
};

/**
 * Delete file from Supabase Storage
 * @param {String} filePath - File path in storage
 * @param {String} bucket - Storage bucket name
 * @returns {Promise<Object>} Deletion result
 */
const deleteFile = async (filePath, bucket) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

module.exports = {
  supabase,
  uploadFile,
  uploadPdf,
  uploadImage,
  deleteFile,
  ensureBucketExists
};

