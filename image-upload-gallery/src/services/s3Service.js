/* eslint-disable no-undef */
import {
  configureS3,
  validateS3Config,
  uploadToS3,
  listS3Objects,
  deleteFromS3,
  getSignedUrl,
  getS3ConfigStatus
} from '../utils/s3Config';

// Constants
const S3_CONFIG_KEY = 'aws_s3_config';
const DEFAULT_EXPIRY = 3600; // 1 hour

class S3Service {
  constructor() {
    this.s3Instance = null;
    this.config = null;
    this.initialized = false;
    this.initializeFromStorage();
  }

  // PUBLIC_INTERFACE
  /**
   * Initialize S3 service from stored configuration
   * @returns {boolean} True if initialization was successful
   */
  initializeFromStorage() {
    try {
      const storedConfig = localStorage.getItem(S3_CONFIG_KEY);
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        return this.configure(config);
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize S3 from storage:', error);
      return false;
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Configure the S3 service with provided credentials
   * @param {Object} config - S3 configuration object
   * @param {string} config.accessKeyId - AWS access key ID
   * @param {string} config.secretAccessKey - AWS secret access key
   * @param {string} config.region - AWS region
   * @param {string} config.bucket - S3 bucket name
   * @param {boolean} [persist=true] - Whether to persist configuration
   * @returns {boolean} True if configuration was successful
   */
  configure(config, persist = true) {
    try {
      // Validate configuration
      const validation = validateS3Config(config);
      if (!validation.isValid) {
        throw new Error(`Invalid S3 configuration: ${validation.errors.join(', ')}`);
      }

      // Configure S3
      this.s3Instance = configureS3(config);
      this.config = config;
      this.initialized = true;

      // Persist configuration if requested
      if (persist) {
        localStorage.setItem(S3_CONFIG_KEY, JSON.stringify(config));
      }

      return true;
    } catch (error) {
      console.error('Failed to configure S3:', error);
      this.initialized = false;
      this.s3Instance = null;
      this.config = null;
      return false;
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Clear stored S3 configuration
   */
  clearConfiguration() {
    localStorage.removeItem(S3_CONFIG_KEY);
    this.initialized = false;
    this.s3Instance = null;
    this.config = null;
  }

  // PUBLIC_INTERFACE
  /**
   * Check if S3 service is properly configured
   * @returns {Object} Configuration status
   */
  getStatus() {
    return {
      ...getS3ConfigStatus(),
      initialized: this.initialized,
      hasStoredConfig: !!localStorage.getItem(S3_CONFIG_KEY)
    };
  }

  // PUBLIC_INTERFACE
  /**
   * Upload a file to S3
   * @param {File} file - File to upload
   * @param {string} [key] - Optional custom key (path) for the file
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, key = null) {
    this.checkInitialization();
    const fileKey = key || `${Date.now()}-${file.name}`;
    return uploadToS3(this.s3Instance, file, this.config.bucket, fileKey);
  }

  // PUBLIC_INTERFACE
  /**
   * List objects in the S3 bucket
   * @param {string} [prefix=''] - Optional prefix to filter objects
   * @returns {Promise<Object>} List of objects
   */
  async listFiles(prefix = '') {
    this.checkInitialization();
    return listS3Objects(this.s3Instance, this.config.bucket, prefix);
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a file from S3
   * @param {string} key - Key of the file to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(key) {
    this.checkInitialization();
    return deleteFromS3(this.s3Instance, this.config.bucket, key);
  }

  // PUBLIC_INTERFACE
  /**
   * Get a signed URL for a file
   * @param {string} key - Key of the file
   * @param {number} [expiresIn=3600] - URL expiration time in seconds
   * @returns {string} Signed URL
   */
  getFileUrl(key, expiresIn = DEFAULT_EXPIRY) {
    this.checkInitialization();
    return getSignedUrl(this.s3Instance, this.config.bucket, key, expiresIn);
  }

  /**
   * Check if service is initialized
   * @private
   * @throws {Error} If service is not initialized
   */
  checkInitialization() {
    if (!this.initialized || !this.s3Instance) {
      throw new Error('S3 service is not initialized. Please configure the service first.');
    }
  }
}

// Create and export a singleton instance
const s3Service = new S3Service();
export default s3Service;
