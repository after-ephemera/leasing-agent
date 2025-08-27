// Test setup file
import { Database } from '../database';

// Create mock database methods
const mockQuery = jest.fn();

// Mock database for tests
export const mockDb = {
  query: mockQuery,
  getPool: jest.fn(),
  close: jest.fn(),
} as unknown as Database;

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
