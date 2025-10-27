/**
 * Error Handler Tests
 */

import {
  AppError,
  parseApiError,
  isNetworkError,
  isAuthError,
  getUserFriendlyMessage,
} from '../../utils/ErrorHandler';

// Mock React Native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Error: 'error',
    Success: 'success',
    Warning: 'warning',
  },
}));

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { extra: 'data' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.status).toBe(400);
      expect(error.detail).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });

    it('should create AppError with minimal properties', () => {
      const error = new AppError('Simple error');
      
      expect(error.message).toBe('Simple error');
      expect(error.code).toBeUndefined();
      expect(error.status).toBeUndefined();
      expect(error.detail).toBeUndefined();
    });

    it('should have proper stack trace', () => {
      const error = new AppError('Stack test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('parseApiError', () => {
    it('should return AppError if already an AppError', () => {
      const originalError = new AppError('Original', 'CODE', 400);
      const result = parseApiError(originalError);
      
      expect(result).toBe(originalError);
    });

    it('should parse string errors', () => {
      const result = parseApiError('String error message');
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error message');
    });

    it('should parse errors with detail as string', () => {
      const error = { detail: 'Detailed error message' };
      const result = parseApiError(error);
      
      expect(result.message).toBe('Detailed error message');
      expect(result.detail).toBe('Detailed error message');
    });

    it('should parse errors with detail as array', () => {
      const error = {
        detail: [
          { msg: 'First error' },
          { message: 'Second error' },
          'Third error',
        ],
      };
      const result = parseApiError(error);
      
      expect(result.message).toBe('First error\nSecond error\nThird error');
      expect(result.detail).toEqual(error.detail);
    });

    it('should parse errors with detail as object', () => {
      const error = {
        detail: { message: 'Object error message' },
      };
      const result = parseApiError(error);
      
      expect(result.message).toBe('Object error message');
      expect(result.detail).toEqual(error.detail);
    });

    it('should parse standard Error objects', () => {
      const error = new Error('Standard error');
      const result = parseApiError(error);
      
      expect(result.message).toBe('Standard error');
    });

    it('should parse apisauce errors', () => {
      const error = {
        problem: 'NETWORK_ERROR',
      };
      const result = parseApiError(error);
      
      expect(result.message).toBe('NETWORK_ERROR');
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should extract status code from error', () => {
      const error = {
        message: 'Unauthorized',
        status: 401,
      };
      const result = parseApiError(error);
      
      expect(result.status).toBe(401);
      expect(result.code).toBe('401');
    });

    it('should extract status from response object', () => {
      const error = {
        message: 'Server error',
        response: { status: 500 },
      };
      const result = parseApiError(error);
      
      expect(result.status).toBe(500);
      expect(result.code).toBe('500');
    });

    it('should use default message for unknown errors', () => {
      const result = parseApiError({});
      
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by code', () => {
      const error = new AppError('Network failed', 'NETWORK_ERROR');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify network errors by message content', () => {
      const error1 = new AppError('Network connection failed');
      const error2 = new AppError('Lost connection to server');
      
      expect(isNetworkError(error1)).toBe(true);
      expect(isNetworkError(error2)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new AppError('Invalid input');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should identify 401 errors as auth errors', () => {
      const error = new AppError('Unauthorized', undefined, 401);
      expect(isAuthError(error)).toBe(true);
    });

    it('should identify 403 errors as auth errors', () => {
      const error = new AppError('Forbidden', undefined, 403);
      expect(isAuthError(error)).toBe(true);
    });

    it('should identify UNAUTHORIZED code as auth error', () => {
      const error = new AppError('Auth failed', 'UNAUTHORIZED');
      expect(isAuthError(error)).toBe(true);
    });

    it('should return false for non-auth errors', () => {
      const error = new AppError('Bad request', undefined, 400);
      expect(isAuthError(error)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for network errors', () => {
      const error = new AppError('Connection failed', 'NETWORK_ERROR');
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Please check your internet connection and try again.');
    });

    it('should return friendly message for auth errors', () => {
      const error = new AppError('Token expired', undefined, 401);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Your session has expired. Please sign in again.');
    });

    it('should return friendly message for server errors', () => {
      const error = new AppError('Internal server error', undefined, 500);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Server error. Please try again later.');
    });

    it('should return original message for client errors', () => {
      const error = new AppError('Invalid email format', undefined, 400);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Invalid email format');
    });

    it('should handle string errors', () => {
      const message = getUserFriendlyMessage('Custom error message');
      expect(message).toBe('Custom error message');
    });
  });

  describe('Error parsing edge cases', () => {
    it('should handle null error', () => {
      const result = parseApiError(null);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should handle undefined error', () => {
      const result = parseApiError(undefined);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should handle errors with both detail and message', () => {
      const error = {
        message: 'Generic message',
        detail: 'Specific detail',
      };
      const result = parseApiError(error);
      
      // Detail should take precedence
      expect(result.message).toBe('Specific detail');
    });

    it('should handle complex nested error objects', () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email' },
              { loc: ['body', 'password'], msg: 'Too short' },
            ],
          },
        },
      };
      
      const result = parseApiError(error);
      expect(result.status).toBe(422);
    });
  });
});

