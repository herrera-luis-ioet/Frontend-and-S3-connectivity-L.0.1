/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUpload from '../components/ImageUpload';
import ImageGallery from '../components/ImageGallery';
import s3Service from '../services/s3Service';

// Mock console.error to avoid polluting test output
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock the s3Service module
jest.mock('../services/s3Service', () => {
  const mockService = {
    uploadFile: jest.fn(),
    listFiles: jest.fn(),
    getFileUrl: jest.fn(),
    getStatus: jest.fn(),
    configure: jest.fn(),
    clearConfiguration: jest.fn(),
    initializeFromStorage: jest.fn(),
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

describe('ImageUpload and ImageGallery Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  // Test 1: Upload and gallery refresh integration
  it('updates gallery after successful upload', async () => {
    const mockImages = [
      { Key: 'existing.jpg', LastModified: new Date('2023-01-01') }
    ];

    // Initial gallery state
    s3Service.listFiles.mockResolvedValueOnce({ Contents: mockImages });
    s3Service.getFileUrl.mockImplementation(key => `https://example.com/${key}`);

    render(
      <div>
        <ImageUpload />
        <ImageGallery />
      </div>
    );

    // Wait for initial configuration check
    await waitFor(() => {
      expect(s3Service.getStatus).toHaveBeenCalled();
    });

    // Verify initial gallery state
    await waitFor(() => {
      const images = screen.getAllByTestId(/^gallery-image-/);
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/existing.jpg');
    });

    // Upload new file
    const file = new File(['test image content'], 'new-image.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    s3Service.uploadFile.mockResolvedValueOnce({ Key: 'new-image.png' });
    
    // Mock updated gallery content
    const updatedMockImages = [
      { Key: 'new-image.png', LastModified: new Date() },
      { Key: 'existing.jpg', LastModified: new Date('2023-01-01') }
    ];
    s3Service.listFiles.mockResolvedValueOnce({ Contents: updatedMockImages });

    fireEvent.change(input, { target: { files: [file] } });

    // Verify upload and gallery update
    await waitFor(() => {
      expect(s3Service.uploadFile).toHaveBeenCalledWith(file, expect.any(String));
      const images = screen.getAllByTestId(/^gallery-image-/);
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/new-image.png');
    });
  });

  // Test 2: Configuration status synchronization
  it('synchronizes configuration status between components', async () => {
    // Mock unconfigured state
    s3Service.getStatus.mockReturnValueOnce({
      initialized: false,
      hasStoredConfig: false,
      isConfigured: false,
      lastError: null,
      bucket: null
    }).mockReturnValueOnce({
      initialized: false,
      hasStoredConfig: false,
      isConfigured: false,
      lastError: null,
      bucket: null
    });

    render(
      <div>
        <ImageUpload />
        <ImageGallery />
      </div>
    );

    // Verify both components show unconfigured state
    expect(screen.getByTestId('upload-area')).toHaveStyle({ backgroundColor: 'error.light' });
    expect(screen.getByTestId('gallery-not-configured')).toBeInTheDocument();

    // Mock configured state
    s3Service.configure.mockImplementationOnce(() => {
      s3Service.getStatus.mockReturnValue({
        initialized: true,
        hasStoredConfig: true,
        isConfigured: true,
        lastError: null,
        bucket: 'test-bucket'
      });
      return true;
    });

    // Trigger configuration
    fireEvent.click(screen.getByTestId('configure-s3-button'));

    // Verify both components update to configured state
    await waitFor(() => {
      expect(screen.getByTestId('upload-area')).not.toHaveStyle({ backgroundColor: 'error.light' });
      expect(screen.queryByTestId('gallery-not-configured')).not.toBeInTheDocument();
    });
  });

  // Test 3: Error handling synchronization
  it('handles errors consistently across components', async () => {
    const error = new Error('Network error');
    s3Service.listFiles.mockRejectedValueOnce(error);
    s3Service.uploadFile.mockRejectedValueOnce(error);

    render(
      <div>
        <ImageUpload />
        <ImageGallery />
      </div>
    );

    // Verify gallery error state
    await waitFor(() => {
      expect(screen.getByTestId('gallery-error-state')).toBeInTheDocument();
    });

    // Attempt upload
    const file = new File(['test image content'], 'test.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });

    // Verify upload error state
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  // Test 4: Configuration status updates
  it('updates all components when configuration changes', async () => {
    render(
      <div>
        <ImageUpload />
        <ImageGallery />
      </div>
    );

    // Mock configuration clear
    s3Service.clearConfiguration.mockImplementationOnce(() => {
      s3Service.getStatus.mockReturnValue({
        initialized: false,
        hasStoredConfig: false,
        isConfigured: false,
        lastError: null,
        bucket: null
      });
    });

    // Clear configuration
    s3Service.clearConfiguration();

    // Verify both components show unconfigured state
    await waitFor(() => {
      expect(screen.getByTestId('upload-area')).toHaveStyle({ backgroundColor: 'error.light' });
      expect(screen.getByTestId('gallery-not-configured')).toBeInTheDocument();
    });
  });
});
