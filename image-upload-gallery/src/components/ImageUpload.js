/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, LinearProgress, Typography, Alert, CircularProgress, Collapse } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import s3Service from '../services/s3Service';

// PUBLIC_INTERFACE
const ImageUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [lastFile, setLastFile] = useState(null);
  const [configStatus, setConfigStatus] = useState({ initialized: false, hasStoredConfig: false, isConfigured: false });
  const configCheckInterval = useRef(null);
  const [isConfigured, setIsConfigured] = useState(configStatus.initialized);
  
  useEffect(() => {
    const checkConfiguration = () => {
      const status = s3Service.getStatus() || { initialized: false, hasStoredConfig: false, isConfigured: false };
      setConfigStatus(status);
      setIsConfigured(status.initialized);
    };
    
    // Initial check
    checkConfiguration();
    
    // Set up configuration check interval
    configCheckInterval.current = setInterval(checkConfiguration, 5000);
    
    // Listen for configuration changes
    window.addEventListener('s3ConfigChanged', checkConfiguration);
    
    return () => {
      window.removeEventListener('s3ConfigChanged', checkConfiguration);
      if (configCheckInterval.current) {
        clearInterval(configCheckInterval.current);
      }
    };
  }, []);

  // Update isConfigured when configStatus changes
  useEffect(() => {
    setIsConfigured(configStatus.initialized);
  }, [configStatus]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const getErrorMessage = (error) => {
    if (error.code === 'NoSuchBucket') {
      return {
        message: 'S3 bucket configuration error',
        details: 'The specified S3 bucket does not exist. Please contact support for assistance.'
      };
    } else if (error.code === 'AccessDenied') {
      return {
        message: 'Access denied to S3',
        details: 'Unable to access the S3 bucket. Please verify your credentials and permissions.'
      };
    } else if (error.code === 'NetworkError') {
      return {
        message: 'Network connection error',
        details: 'Please check your internet connection and try again.'
      };
    }
    return {
      message: error.message || 'Failed to upload file',
      details: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
    };
  };

  const handleFileUpload = async (file) => {
    // Get latest configuration status
    const currentStatus = s3Service.getStatus() || { initialized: false, hasStoredConfig: false, isConfigured: false };
    if (!currentStatus.initialized) {
      setErrorMessage('S3 is not configured');
      setErrorDetails('Please configure S3 settings before uploading files.');
      setUploadStatus('error');
      return;
    }

    // Validate file
    if (!file) {
      setErrorMessage('No file selected');
      setErrorDetails('Please select a file to upload.');
      setUploadStatus('error');
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validImageTypes.includes(file.type)) {
      setErrorMessage('Invalid file type');
      setErrorDetails('Please select a valid image file (JPEG, PNG, or GIF).');
      setUploadStatus('error');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');
      setErrorDetails('');
      setLastFile(file);
      
      await s3Service.uploadFile(file);
      
      setUploadStatus('success');
      // Reset progress after 3 seconds of success
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorInfo = getErrorMessage(error);
      setErrorMessage(errorInfo.message);
      setErrorDetails(errorInfo.details);
      setUploadStatus('error');
      setUploadProgress(0);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 3 }}>
      <Box
        data-testid="upload-area"
        sx={{
          border: 2,
          borderRadius: 2,
          borderColor: !isConfigured ? 'error.main' : (isDragging ? 'primary.main' : 'grey.300'),
          borderStyle: 'dashed',
          p: 3,
          textAlign: 'center',
          backgroundColor: !isConfigured ? 'error.light' : (isDragging ? 'rgba(25, 118, 210, 0.08)' : 'background.paper'),
          cursor: isConfigured ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isDragging ? '0 0 10px rgba(25, 118, 210, 0.2)' : 'none',
          opacity: isConfigured ? 1 : 0.7
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
          data-testid="file-input"
        />
        <label htmlFor="file-input">
          <CloudUploadIcon sx={{ fontSize: 48, color: isConfigured ? 'primary.main' : 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom data-testid="upload-text">
            Drag and drop an image here
          </Typography>
          {isConfigured ? (
            <Button
              variant="contained"
              component="span"
              sx={{ mt: 2 }}
              data-testid="select-file-button"
            >
              Or Select File
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<SettingsIcon />}
              onClick={() => window.dispatchEvent(new CustomEvent('openS3Config'))}
              sx={{ mt: 2 }}
              data-testid="configure-s3-button"
            >
              Configure S3
            </Button>
          )}
        </label>
      </Box>
      {uploadStatus !== 'idle' && (
        <Box sx={{ width: '100%', mt: 2 }}>
          {uploadStatus === 'uploading' && (
            <Box sx={{ position: 'relative' }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress}
                data-testid="upload-progress"
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    transition: 'transform 0.3s ease'
                  }
                }} 
              />
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mt: 1 
              }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2" color="primary">
                  Uploading: {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            </Box>
          )}
          
          {uploadStatus === 'success' && (
            <Alert 
              icon={<CheckCircleIcon fontSize="inherit" />} 
              severity="success"
              sx={{ mt: 1 }}
            >
              File uploaded successfully!
            </Alert>
          )}
          
          {uploadStatus === 'error' && (
            <Box sx={{ mt: 1 }}>
              <Alert 
                icon={<ErrorIcon fontSize="inherit" />} 
                severity="error"
                action={
                  <Button
                    color="error"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => lastFile && handleFileUpload(lastFile)}
                    data-testid="retry-upload-button"
                  >
                    Retry
                  </Button>
                }
              >
                {errorMessage}
              </Alert>
              <Collapse in={Boolean(errorDetails)}>
                <Alert 
                  severity="info" 
                  sx={{ mt: 1 }}
                >
                  {errorDetails}
                </Alert>
              </Collapse>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ImageUpload;
