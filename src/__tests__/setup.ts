/**
 * Jest Test Setup
 */

import { logger } from '@/utils/logger';

// Suppress logs during testing
beforeAll(() => {
  logger.setMinLevel(4); // CRITICAL only
});

afterAll(() => {
  jest.clearAllMocks();
});

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
