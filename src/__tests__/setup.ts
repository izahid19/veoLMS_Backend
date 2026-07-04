import 'dotenv/config';
import { jest } from '@jest/globals';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose') as object;
  return {
    ...actualMongoose,
    connect: jest.fn(),
  };
});

// Mock User Model
jest.mock('../models/user.model', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  };
});

// Mock Redis
jest.mock('../config/redis', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
    },
  };
});

// Mock Email Utility
jest.mock('../utils/email', () => {
  return {
    sendOTPEmail: jest.fn(),
  };
});
