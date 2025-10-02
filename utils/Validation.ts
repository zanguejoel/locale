/**
 * Input Validation Utilities
 * Provides comprehensive validation for all user inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 50;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/**
 * Validate email address
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      error: 'Password must contain uppercase, lowercase, number, and special character',
    };
  }
  
  return { isValid: true };
};

/**
 * Validate name (first name, last name, etc.)
 */
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${MAX_NAME_LENGTH} characters`,
    };
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return {
      isValid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }
  
  return { isValid: true };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: string): ValidationResult => {
  // Phone is optional
  if (!phone || phone.trim().length === 0) {
    return { isValid: true };
  }
  
  // Remove all non-digits for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < MIN_PHONE_DIGITS || digitsOnly.length > MAX_PHONE_DIGITS) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number',
    };
  }
  
  return { isValid: true };
};

/**
 * Validate password confirmation
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true };
};

/**
 * Validate verification code
 */
export const validateCode = (code: string): ValidationResult => {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: 'Verification code is required' };
  }
  
  // Assuming 6-digit code
  if (!/^\d{6}$/.test(code)) {
    return { isValid: false, error: 'Please enter a valid 6-digit code' };
  }
  
  return { isValid: true };
};

/**
 * Validate multiple fields at once
 */
export const validateFormData = (
  formData: any,
  rules: Record<string, (value: any) => ValidationResult>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(formData[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
};

/**
 * Check if string is empty or whitespace
 */
export const isEmpty = (value: string | null | undefined): boolean => {
  return !value || value.trim().length === 0;
};

/**
 * Sanitize string input (remove potential XSS)
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

