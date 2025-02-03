import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as s3Config from './utils/s3Config';

// Mock the s3Config module
jest.mock('./utils/s3Config', () => ({
  configureS3: jest.fn(),
  getS3ConfigStatus: jest.fn().mockReturnValue({
    isConfigured: true,
    lastError: null,
    bucket: 'test-bucket'
  })
}));

describe('App Component', () => {
  const mockConfig = {
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    region: 'test-region',
    bucket: 'test-bucket'
  };

  beforeEach(() => {
    // Mock environment variables
    process.env.REACT_APP_AWS_ACCESS_KEY_ID = mockConfig.accessKeyId;
    process.env.REACT_APP_AWS_SECRET_ACCESS_KEY = mockConfig.secretAccessKey;
    process.env.REACT_APP_AWS_REGION = mockConfig.region;
    process.env.REACT_APP_S3_BUCKET = mockConfig.bucket;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.REACT_APP_AWS_ACCESS_KEY_ID;
    delete process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
    delete process.env.REACT_APP_AWS_REGION;
    delete process.env.REACT_APP_S3_BUCKET;
  });

  test('renders main heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/Image Upload and Display Component/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('renders error message when S3 configuration fails', () => {
    s3Config.configureS3.mockImplementationOnce(() => {
      throw new Error('Failed to configure S3');
    });

    render(<App />);
    const errorElement = screen.getByText(/Failed to configure S3/i);
    expect(errorElement).toBeInTheDocument();
  });
});
