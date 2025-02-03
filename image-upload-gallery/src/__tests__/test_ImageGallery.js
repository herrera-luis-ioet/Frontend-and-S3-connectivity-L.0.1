/* eslint-disable no-undef */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageGallery from '../components/ImageGallery';
import s3Service from '../services/s3Service';

// Mock console.error to avoid polluting test output
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock the s3Service module
jest.mock('../services/s3Service', () => {
  const mockService = {
    listFiles: jest.fn(),
    getFileUrl: jest.fn(),
    getStatus: jest.fn(),
    configure: jest.fn(),
    clearConfiguration: jest.fn(),
    initializeFromStorage: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn()
  };

  // Set default mock implementation for getStatus
  mockService.getStatus.mockReturnValue({
    initialized: true,
    hasStoredConfig: true,
    isConfigured: true,
    lastError: null,
    bucket: 'test-bucket'
  });

  return mockService;
});

describe('ImageGallery Component', () => {
  const mockS3 = {};
  const mockBucket = 'test-bucket';
  const mockPrefix = 'test-prefix';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  // Test 1: Loading state
  it('shows loading state initially', async () => {
    render(<ImageGallery />);
    await waitFor(() => {
      const loadingSpinner = screen.getByTestId('gallery-loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      expect(screen.getByTestId('gallery-loading-container')).toHaveStyle({ minHeight: '200px' });
    });
  });

  // Test 2: Empty state
  it('shows empty state when no images are found', async () => {
    s3Service.listFiles.mockResolvedValueOnce({ Contents: [] });

    render(<ImageGallery />);

    await waitFor(() => {
      expect(screen.getByTestId('gallery-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('gallery-empty-state-title')).toHaveTextContent('No images found');
      expect(screen.getByTestId('gallery-empty-state-subtitle')).toHaveTextContent('Upload some images to get started');
    });
  });

  // Test 3: Error state
  it('shows error state when loading fails', async () => {
    const error = new Error('Failed to load images');
    s3Service.listFiles.mockRejectedValueOnce(error);

    render(<ImageGallery />);

    await waitFor(() => {
      expect(screen.getByTestId('gallery-error-state')).toBeInTheDocument();
      expect(screen.getByTestId('gallery-error-message')).toHaveTextContent('Failed to load images. Please try again later.');
      expect(screen.getByTestId('gallery-error-help')).toHaveTextContent('If the issue persists, please verify your S3 configuration or contact support.');
      expect(console.error).toHaveBeenCalledWith('Error loading images:', error);
    });
  });

  // Test 4: Successful image loading
  it('displays images in a grid when loaded successfully', async () => {
    const mockImages = [
      { Key: 'image1.jpg', LastModified: new Date('2023-01-01') },
      { Key: 'image2.png', LastModified: new Date('2023-01-02') }
    ];

    s3Service.listFiles.mockResolvedValueOnce({ Contents: mockImages });
    s3Service.getFileUrl.mockImplementation(key => `https://example.com/${key}`);

    render(<ImageGallery />);

    await waitFor(() => {
      const images = screen.getAllByTestId(/^gallery-image-/);
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/image2.png');
      expect(images[1]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });
  });

  // Test 5: Image filtering
  it('filters non-image files from the list', async () => {
    const mockContents = [
      { Key: 'image1.jpg', LastModified: new Date() },
      { Key: 'document.pdf', LastModified: new Date() },
      { Key: 'image2.PNG', LastModified: new Date() }
    ];

    s3Service.listFiles.mockResolvedValueOnce({ Contents: mockContents });
    s3Service.getFileUrl.mockImplementation(key => `https://example.com/${key}`);

    render(<ImageGallery />);

    await waitFor(() => {
      const images = screen.getAllByTestId(/^gallery-image-/);
      expect(images).toHaveLength(2);
    });
  });

  // Test 6: Prefix handling
  it('uses prefix when provided', async () => {
    s3Service.listFiles.mockResolvedValueOnce({ Contents: [] });

    render(<ImageGallery prefix={mockPrefix} />);

    await waitFor(() => {
      expect(s3Service.listFiles).toHaveBeenCalledWith(mockPrefix);
    });
  });

  // Test 7: Image sorting
  it('sorts images by last modified date in descending order', async () => {
    const mockImages = [
      { Key: 'old.jpg', LastModified: new Date('2023-01-01') },
      { Key: 'new.jpg', LastModified: new Date('2023-01-02') }
    ];

    s3Service.listFiles.mockResolvedValueOnce({ Contents: mockImages });
    s3Service.getFileUrl.mockImplementation(key => `https://example.com/${key}`);

    render(<ImageGallery />);

    await waitFor(() => {
      const images = screen.getAllByTestId(/^gallery-image-/);
      expect(images[0]).toHaveAttribute('alt', 'new.jpg');
      expect(images[1]).toHaveAttribute('alt', 'old.jpg');
    });
  });

  // Test 8: Not configured state
  it('shows not configured state when S3 is not initialized', async () => {
    s3Service.getStatus.mockReturnValueOnce({
      initialized: false,
      hasStoredConfig: false,
      isConfigured: false,
      lastError: null,
      bucket: null
    });

    render(<ImageGallery />);

    expect(screen.getByTestId('gallery-not-configured')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-not-configured-title')).toHaveTextContent('S3 service is not configured');
    expect(screen.getByTestId('gallery-not-configured-message')).toHaveTextContent('Please configure your S3 settings to view and upload images');
  });

  // Test 9: Responsive grid layout
  it('renders images in a responsive grid layout', async () => {
    const mockImages = [
      { Key: 'image1.jpg', LastModified: new Date() }
    ];

    s3Service.listFiles.mockResolvedValueOnce({ Contents: mockImages });
    s3Service.getFileUrl.mockReturnValue('https://example.com/image1.jpg');

    render(<ImageGallery />);

    await waitFor(() => {
      const gridItem = screen.getByTestId(/^gallery-image-/).closest('.MuiGrid-item');
      expect(gridItem).toHaveClass('MuiGrid-grid-xs-12');
      expect(gridItem).toHaveClass('MuiGrid-grid-sm-6');
      expect(gridItem).toHaveClass('MuiGrid-grid-md-4');
      expect(gridItem).toHaveClass('MuiGrid-grid-lg-3');
    });
  });
});
