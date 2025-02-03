// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock global objects that might be missing in test environment
global.File = class {
  constructor(parts, filename, options = {}) {
    this.parts = parts;
    this.filename = filename;
    this.type = options.type || '';
  }
};

global.console = {
  ...console,
  // Mock console methods to avoid polluting test output
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock browser APIs
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn(),
};

// Mock FileReader
global.FileReader = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }

  readAsDataURL(blob) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/jpeg;base64,mock' } });
      }
    }, 0);
  }
};

// Mock FormData
global.FormData = class {
  constructor() {
    this.data = new Map();
  }

  append(key, value) {
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
  })
);