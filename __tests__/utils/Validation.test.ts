/**
 * Validation Utilities Tests
 */

import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validatePasswordMatch,
  validateCode,
  validateFormData,
  isEmpty,
  sanitizeInput,
} from '../../utils/Validation';

describe('Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject empty or whitespace email', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is too long');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'Str0ng@Pass',
        'MyP@ssw0rd',
        'C0mplex#Pass',
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('special character');
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });
  });

  describe('validateName', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John',
        'Mary Jane',
        "O'Brien",
        'Jean-Pierre',
        'María',
      ];

      validNames.forEach(name => {
        const result = validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty name', () => {
      const result = validateName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = ['John123', 'User@Name', 'Name!'];

      invalidNames.forEach(name => {
        const result = validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51);
      const result = validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 50 characters');
    });

    it('should use custom field name in error message', () => {
      const result = validateName('', 'First Name');
      expect(result.error).toBe('First Name is required');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '1234567890',
        '+1 (234) 567-8900',
        '123-456-7890',
        '+44 7911 123456',
      ];

      validPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should accept empty phone (optional field)', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(true);
    });

    it('should reject phone with too few digits', () => {
      const result = validatePhone('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid phone number');
    });

    it('should reject phone with too many digits', () => {
      const result = validatePhone('1234567890123456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid phone number');
    });
  });

  describe('validatePasswordMatch', () => {
    it('should validate matching passwords', () => {
      const result = validatePasswordMatch('password123', 'password123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-matching passwords', () => {
      const result = validatePasswordMatch('password123', 'different123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });

    it('should reject empty confirmation', () => {
      const result = validatePasswordMatch('password123', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please confirm your password');
    });
  });

  describe('validateCode', () => {
    it('should validate correct 6-digit code', () => {
      const result = validateCode('123456');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject code with wrong length', () => {
      const invalidCodes = ['12345', '1234567', '12'];

      invalidCodes.forEach(code => {
        const result = validateCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('6-digit code');
      });
    });

    it('should reject code with non-digits', () => {
      const result = validateCode('12345a');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6-digit code');
    });

    it('should reject empty code', () => {
      const result = validateCode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Verification code is required');
    });
  });

  describe('validateFormData', () => {
    it('should validate multiple fields', () => {
      const formData = {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'John Doe',
      };

      const rules = {
        email: validateEmail,
        password: validatePassword,
        name: validateName,
      };

      const errors = validateFormData(formData, rules);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should return errors for invalid fields', () => {
      const formData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
      };

      const rules = {
        email: validateEmail,
        password: validatePassword,
        name: validateName,
      };

      const errors = validateFormData(formData, rules);
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.name).toBeDefined();
    });

    it('should only return errors for failed validations', () => {
      const formData = {
        email: 'user@example.com',
        password: 'weak',
      };

      const rules = {
        email: validateEmail,
        password: validatePassword,
      };

      const errors = validateFormData(formData, rules);
      expect(errors.email).toBeUndefined();
      expect(errors.password).toBeDefined();
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty('text')).toBe(false);
      expect(isEmpty(' text ')).toBe(false);
      expect(isEmpty('0')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove potential XSS characters', () => {
      expect(sanitizeInput('<script>alert("XSS")</script>')).toBe('scriptalert("XSS")/script');
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\n\ttext\n\t')).toBe('text');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeInput('Hello, World! 123')).toBe('Hello, World! 123');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com');
    });
  });
});

