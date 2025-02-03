import AWS from 'aws-sdk';

// Configuration status
let s3ConfigStatus = {
  isConfigured: false,
  lastError: null,
  bucket: null
};

// PUBLIC_INTERFACE
/**
 * Validates S3 configuration parameters
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result with isValid and errors
 */
export const validateS3Config = (config) => {
  const errors = [];
  const required = ['accessKeyId', 'secretAccessKey', 'region', 'bucket'];
  
  required.forEach(param => {
    if (!config[param]) {
      errors.push(`Missing required parameter: ${param}`);
    }
  });

  if (config.region && !/^[a-z]{2}-[a-z]+-\d{1}$/.test(config.region)) {
    errors.push('Invalid AWS region format (e.g., us-east-1)');
  }

  if (config.bucket && !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(config.bucket)) {
    errors.push('Invalid S3 bucket name format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// PUBLIC_INTERFACE
/**
 * Configures AWS S3 with the provided credentials and region
 * @param {Object} config - Configuration object
 * @param {string} config.accessKeyId - AWS access key ID
 * @param {string} config.secretAccessKey - AWS secret access key
 * @param {string} config.region - AWS region
 * @param {string} config.bucket - S3 bucket name
 * @returns {AWS.S3} Configured S3 instance
 * @throws {Error} If configuration is invalid or AWS SDK initialization fails
 */
export const configureS3 = (config) => {
  try {
    // Validate configuration
    const validation = validateS3Config(config);
    if (!validation.isValid) {
      throw new Error(`S3 Configuration Error: ${validation.errors.join(', ')}`);
    }

    const { accessKeyId, secretAccessKey, region, bucket } = config;

    // Configure AWS SDK
    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region,
    });

    // Create S3 instance
    const s3 = new AWS.S3();
    
    // Update configuration status
    s3ConfigStatus = {
      isConfigured: true,
      lastError: null,
      bucket
    };

    return s3;
  } catch (error) {
    s3ConfigStatus.isConfigured = false;
    s3ConfigStatus.lastError = error.message;
    throw new Error(`Failed to configure S3: ${error.message}`);
  }
};

// PUBLIC_INTERFACE
/**
 * Gets the current S3 configuration status
 * @returns {Object} Configuration status object
 */
export const getS3ConfigStatus = () => ({
  ...s3ConfigStatus
});

// PUBLIC_INTERFACE
/**
 * Uploads a file to S3
 * @param {AWS.S3} s3 - Configured S3 instance
 * @param {File} file - File to upload
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<AWS.S3.ManagedUpload.SendData>} Upload result
 */
export const uploadToS3 = async (s3, file, bucket, key) => {
  if (!s3ConfigStatus.isConfigured) {
    throw new Error('S3 is not properly configured. Please check your configuration.');
  }

  if (!file) {
    throw new Error('No file provided for upload');
  }

  if (!key) {
    throw new Error('No key (file path) provided for upload');
  }

  const params = {
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: file.type,
  };

  try {
    const result = await s3.upload(params).promise();
    return result;
  } catch (error) {
    const userFriendlyError = new Error(
      `Failed to upload file "${file.name}": ${
        error.code === 'NoSuchBucket' ? 'The specified S3 bucket does not exist' :
        error.code === 'AccessDenied' ? 'Access denied to S3 bucket' :
        'An error occurred during upload'
      }`
    );
    userFriendlyError.originalError = error;
    console.error('Error uploading to S3:', error);
    throw userFriendlyError;
  }
};

// PUBLIC_INTERFACE
/**
 * Lists objects in an S3 bucket
 * @param {AWS.S3} s3 - Configured S3 instance
 * @param {string} bucket - S3 bucket name
 * @param {string} [prefix] - Optional prefix to filter objects
 * @returns {Promise<AWS.S3.ListObjectsV2Output>} List of objects
 */
export const listS3Objects = async (s3, bucket, prefix = '') => {
  if (!s3ConfigStatus.isConfigured) {
    throw new Error('S3 is not properly configured. Please check your configuration.');
  }

  const params = {
    Bucket: bucket,
    Prefix: prefix,
  };

  try {
    const result = await s3.listObjectsV2(params).promise();
    return result;
  } catch (error) {
    const userFriendlyError = new Error(
      `Failed to list objects in bucket: ${
        error.code === 'NoSuchBucket' ? 'The specified S3 bucket does not exist' :
        error.code === 'AccessDenied' ? 'Access denied to S3 bucket' :
        'An error occurred while listing objects'
      }`
    );
    userFriendlyError.originalError = error;
    console.error('Error listing S3 objects:', error);
    throw userFriendlyError;
  }
};

// PUBLIC_INTERFACE
/**
 * Deletes an object from S3
 * @param {AWS.S3} s3 - Configured S3 instance
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<AWS.S3.DeleteObjectOutput>} Delete result
 */
export const deleteFromS3 = async (s3, bucket, key) => {
  if (!s3ConfigStatus.isConfigured) {
    throw new Error('S3 is not properly configured. Please check your configuration.');
  }

  if (!key) {
    throw new Error('No key (file path) provided for deletion');
  }

  const params = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const result = await s3.deleteObject(params).promise();
    return result;
  } catch (error) {
    const userFriendlyError = new Error(
      `Failed to delete file "${key}": ${
        error.code === 'NoSuchBucket' ? 'The specified S3 bucket does not exist' :
        error.code === 'AccessDenied' ? 'Access denied to S3 bucket' :
        error.code === 'NoSuchKey' ? 'The specified file does not exist' :
        'An error occurred while deleting the file'
      }`
    );
    userFriendlyError.originalError = error;
    console.error('Error deleting from S3:', error);
    throw userFriendlyError;
  }
};

// PUBLIC_INTERFACE
/**
 * Gets a signed URL for an S3 object
 * @param {AWS.S3} s3 - Configured S3 instance
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - URL expiration time in seconds
 * @returns {string} Signed URL
 */
export const getSignedUrl = (s3, bucket, key, expiresIn = 3600) => {
  if (!s3ConfigStatus.isConfigured) {
    throw new Error('S3 is not properly configured. Please check your configuration.');
  }

  if (!key) {
    throw new Error('No key (file path) provided for generating signed URL');
  }

  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn,
  };

  try {
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    const userFriendlyError = new Error(
      `Failed to generate signed URL for "${key}": ${
        error.code === 'NoSuchBucket' ? 'The specified S3 bucket does not exist' :
        error.code === 'AccessDenied' ? 'Access denied to S3 bucket' :
        error.code === 'NoSuchKey' ? 'The specified file does not exist' :
        'An error occurred while generating the URL'
      }`
    );
    userFriendlyError.originalError = error;
    console.error('Error generating signed URL:', error);
    throw userFriendlyError;
  }
};
