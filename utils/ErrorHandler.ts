/**
 * Centralized Error Handling
 * Provides consistent error handling across the application
 */

import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public detail?: any
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Parse any error into standardized AppError format
 */
export const parseApiError = (error: any): AppError => {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  let message = 'An unexpected error occurred';
  let detail = undefined;
  let code = undefined;
  let status = undefined;

  // Handle string errors
  if (typeof error === 'string') {
    message = error;
  }
  // Handle API errors with detail field
  else if (error?.detail) {
    if (Array.isArray(error.detail)) {
      message = error.detail.map((e: any) => e.msg || e.message || String(e)).join('\n');
      detail = error.detail;
    } else if (typeof error.detail === 'string') {
      message = error.detail;
      detail = error.detail;
    } else if (typeof error.detail === 'object') {
      message = error.detail.message || JSON.stringify(error.detail);
      detail = error.detail;
    }
  }
  // Handle standard Error objects
  else if (error?.message) {
    message = error.message;
  }
  // Handle apisauce problem field
  else if (error?.problem) {
    message = error.problem;
    code = error.problem;
  }

  // Extract status and code
  status = error?.status || error?.response?.status;
  code = code || error?.code || error?.response?.status?.toString();

  return new AppError(message, code, status, detail);
};

/**
 * Handle error with user-visible alert
 */
export const handleError = (error: any, context?: string, options?: { showAlert?: boolean; haptic?: boolean }): void => {
  const { showAlert = true, haptic = true } = options || {};
  const appError = parseApiError(error);
  
  // Log to console for debugging
  // console.error(`[${context || 'App'}] Error:`, {
  //   message: appError.message,
  //   code: appError.code,
  //   status: appError.status,
  //   detail: appError.detail,
  //   stack: appError.stack,
  // });

  // Provide haptic feedback for errors
  if (haptic) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Silently fail if haptics not available
    });
  }

  // Show user-friendly alert
  if (showAlert) {
    const friendlyMessage = getUserFriendlyMessage(appError);
    Alert.alert(
      context ? `${context} Error` : 'Error',
      friendlyMessage,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }
};

/**
 * Handle error silently (log only, no alert)
 */
export const handleErrorSilent = (error: any, context?: string): AppError => {
  const appError = parseApiError(error);
  
  // console.error(`[${context || 'App'}] Silent Error:`, {
  //   message: appError.message,
  //   code: appError.code,
  //   status: appError.status,
  // });
  
  return appError;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  const appError = parseApiError(error);
  return (
    appError.code === 'NETWORK_ERROR' ||
    appError.message?.toLowerCase().includes('network') ||
    appError.message?.toLowerCase().includes('connection')
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  const appError = parseApiError(error);
  return (
    appError.status === 401 ||
    appError.status === 403 ||
    appError.code === 'UNAUTHORIZED'
  );
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: any): string => {
  const appError = parseApiError(error);
  
  // Network errors
  if (isNetworkError(appError)) {
    return 'Please check your internet connection and try again.';
  }
  
  // Auth errors
  if (isAuthError(appError)) {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Server errors
  if (appError.status && appError.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  // Default to parsed message
  return appError.message;
};

