/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUpload from '../components/ImageUpload';
import s3Service from '../services/s3Service';

// Mock console.error to avoid polluting test output
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock the s3Service module
jest.mock('../services/s3Service', () => {
  const mockService = {
    uploadFile: jest.fn(),
    getStatus: jest.fn(),
    configure: jest.fn(),
    clearConfiguration: jest.fn(),
    initializeFromStorage: jest.fn(),
    getFileUrl: jest.fn()
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

describe('ImageUpload Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  // Test 1: Component renders correctly
  it('renders upload area with correct elements', async () => {
    render(<ImageUpload />);
    
    await waitFor(() => {
      // Check for the main text elements
      expect(screen.getByTestId('upload-text')).toHaveTextContent('Drag and drop an image here');
      
      // Check for the file input
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
      
      // Check for the upload area
      expect(screen.getByTestId('upload-area')).toBeInTheDocument();
      
      // Check for the Configure S3 button when not configured
      expect(screen.getByTestId('configure-s3-button')).toBeInTheDocument();
    });
  });

  // Test 2: File selection through button
  it('handles file selection through button click', async () => {
    render(<ImageUpload />);
    
    const file = new File(['test image content'], 'test-image.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    s3Service.uploadFile.mockResolvedValueOnce({ Key: 'test-image.png' });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(file, expect.any(String));
    });
  });

  // Test 3: Drag and drop functionality
  it('handles drag and drop file upload', async () => {
    render(<ImageUpload />);
    
    const file = new File(['test image content'], 'test-image.png', { type: 'image/png' });
    const dropZone = screen.getByTestId('upload-area');
    
    s3Service.uploadFile.mockResolvedValueOnce({ Key: 'test-image.png' });
    
    // Simulate drag events
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({ backgroundColor: 'rgba(25, 118, 210, 0.08)' });
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({ backgroundColor: 'background.paper' });
    
    // Simulate file drop
    const dropEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: {
        files: [file]
      }
    };
    
    fireEvent.drop(dropZone, dropEvent);
    
    await waitFor(() => {
      expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(file, expect.any(String));
    });
  });

  // Test 4: Upload progress indication
  it('shows upload progress', async () => {
    render(<ImageUpload />);
    
    const file = new File(['test image content'], 'test-image.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    // Mock uploadFile to simulate progress updates
    s3Service.uploadFile.mockImplementationOnce((file, key) => {
      return Promise.resolve({ Key: key });
    });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Uploading: 0%')).toBeInTheDocument();
    });
  });

  // Test 5: Error handling
  it('handles upload error correctly', async () => {
    render(<ImageUpload />);
    
    const file = new File(['test image content'], 'test-image.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    
    // Mock uploadFile to throw an error
    const error = new Error('Upload failed');
    s3Service.uploadFile.mockRejectedValueOnce(error);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error uploading file:', error);
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred. Please try again or contact support if the issue persists.')).toBeInTheDocument();
    });
  });

  // Test 6: File type validation
  it('accepts only image files', () => {
    render(<ImageUpload />);
    
    const input = screen.getByLabelText('Drag and drop an image here');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  // Test 7: Multiple drag events handling
  it('handles multiple drag events correctly', () => {
    render(<ImageUpload />);
    
    const dropZone = screen.getByText('Drag and drop an image here').parentElement;
    
    // Multiple drag enter/leave events
    fireEvent.dragEnter(dropZone);
    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveStyle({ backgroundColor: 'rgba(25, 118, 210, 0.08)' });
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({ backgroundColor: 'rgba(25, 118, 210, 0.08)' });
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle({ backgroundColor: 'background.paper' });
  });

  // Test 8: Empty file selection handling
  it('handles empty file selection', async () => {
    render(<ImageUpload />);
    
    const input = screen.getByLabelText('Drag and drop an image here');
    
    fireEvent.change(input, { target: { files: [] } });
    
    await waitFor(() => {
      expect(s3Service.uploadFile).not.toHaveBeenCalled();
    });
  });

  // Test 9: Not configured state
  it('shows not configured state', () => {
    // Mock s3Service to return not configured state
    s3Service.getStatus.mockReturnValueOnce({
      initialized: false,
      hasStoredConfig: false,
      isConfigured: false,
      lastError: null,
      bucket: null
    });

    render(<ImageUpload />);
    
    expect(screen.getByText('Configure S3')).toBeInTheDocument();
    const dropZone = screen.getByText('Drag and drop an image here').parentElement;
    expect(dropZone).toHaveStyle({ backgroundColor: 'error.light' });
  });
});
