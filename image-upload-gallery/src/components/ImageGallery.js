import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, Card, CardMedia, CircularProgress, Typography, Box, useTheme, Alert, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import s3Service from '../services/s3Service';

// Configuration check interval in milliseconds
const CONFIG_CHECK_INTERVAL = 5000;

// PUBLIC_INTERFACE
/**
 * ImageGallery component for displaying uploaded images in a responsive grid layout
 * @param {Object} props - Component props
 * @param {string} [props.prefix=''] - Optional prefix to filter images
 * @returns {React.Component} ImageGallery component
 */
const ImageGallery = ({ prefix = '' }) => {
  const theme = useTheme();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getErrorMessage = (error) => {
    if (error.code === 'NoSuchBucket') {
      return 'The specified S3 bucket does not exist. Please verify your configuration.';
    } else if (error.code === 'AccessDenied') {
      return 'Access denied. Please check your S3 permissions and credentials.';
    } else if (error.code === 'NetworkError') {
      return 'Network error. Please check your internet connection and try again.';
    }
    return error.message || 'Failed to load images. Please try again later.';
  };

  const [configStatus, setConfigStatus] = useState({ initialized: false, hasStoredConfig: false, isConfigured: false });
  const configCheckInterval = useRef(null);

  // Configuration status check effect
  useEffect(() => {
    const checkConfigStatus = () => {
      const status = s3Service.getStatus();
      const newStatus = status || { initialized: false, hasStoredConfig: false, isConfigured: false };
      if (newStatus.initialized !== configStatus.initialized) {
        setConfigStatus(newStatus);
      }
    };

    // Initial check
    checkConfigStatus();

    // Set up interval for periodic checks
    configCheckInterval.current = setInterval(checkConfigStatus, CONFIG_CHECK_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (configCheckInterval.current) {
        clearInterval(configCheckInterval.current);
      }
    };
  }, [configStatus.initialized]);

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check S3 configuration status
      const status = s3Service.getStatus() || { initialized: false, hasStoredConfig: false, isConfigured: false };
      setConfigStatus(status);

      if (!status.initialized) {
        throw new Error('S3 service is not configured. Please configure S3 settings first.');
      }

      // List objects from S3
      const response = await s3Service.listFiles(prefix);
      
      // Get signed URLs for each image
      const imageUrls = response.Contents
        .filter(obj => obj.Key.match(/\.(jpg|jpeg|png|gif)$/i)) // Filter image files
        .map((obj) => ({
          key: obj.Key,
          url: s3Service.getFileUrl(obj.Key),
          lastModified: obj.LastModified
        }));

      // Sort by last modified date, newest first
      setImages(imageUrls.sort((a, b) => b.lastModified - a.lastModified));
    } catch (err) {
      console.error('Error loading images:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    loadImages();
  }, [prefix, loadImages]);

  if (!configStatus.initialized) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="200px"
        gap={2}
        p={3}
        data-testid="gallery-not-configured"
      >
        <Alert 
          severity="warning"
          icon={<SettingsIcon />}
          sx={{ width: '100%', maxWidth: 600 }}
        >
          <span data-testid="gallery-not-configured-title">S3 service is not configured</span>
        </Alert>
        <Typography variant="body2" color="text.secondary" align="center">
          <span data-testid="gallery-not-configured-message">Please configure your S3 settings to view and upload images</span>
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" data-testid="gallery-loading-container">
        <CircularProgress data-testid="gallery-loading-spinner" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="200px"
        gap={2}
        p={3}
        data-testid="gallery-error-state"
      >
        <Alert 
          severity="error"
          action={
            <Button
              color="error"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => {
                setLoading(true);
                loadImages();
              }}
              data-testid="retry-load-button"
            >
              Retry
            </Button>
          }
          sx={{ width: '100%', maxWidth: 600 }}
        >
          <span data-testid="gallery-error-message">{error}</span>
        </Alert>
        <Typography variant="body2" color="text.secondary" align="center">
          <span data-testid="gallery-error-help">If the issue persists, please verify your S3 configuration or contact support.</span>
        </Typography>
      </Box>
    );
  }

  if (images.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        p={3}
        data-testid="gallery-empty-state"
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          <span data-testid="gallery-empty-state-title">No images found</span>
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          <span data-testid="gallery-empty-state-subtitle">Upload some images to get started</span>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Grid 
        container 
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          width: '100%',
          margin: '0 auto',
          maxWidth: theme.breakpoints.values.lg
        }}
      >
        {images.map((image) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={image.key}>
            <Card 
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  elevation: 8,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={image.url}
                alt={image.key.split('/').pop()}
                data-testid={`gallery-image-${image.key.split('/').pop()}`}
                sx={{
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ImageGallery;
