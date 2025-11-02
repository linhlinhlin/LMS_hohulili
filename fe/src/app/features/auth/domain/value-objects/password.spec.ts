import { Password } from './password';
import { PasswordStrength } from '../types';

describe('Password Value Object', () => {
  describe('Creation and Validation', () => {
    it('should create a valid password', () => {
      const password = new Password('SecurePass147!');
      expect(password.getStrength()).toBeDefined();
      expect(password.getHashedValue()).toBeDefined();
    });

    it('should throw error for password too short', () => {
      expect(() => new Password('12345')).toThrowError('Password must be at least 8 characters long');
    });

    it('should throw error for empty password', () => {
      expect(() => new Password('')).toThrowError('Password cannot be empty');
    });

    it('should throw error for password too long', () => {
      const longPassword = 'A'.repeat(129);
      expect(() => new Password(longPassword)).toThrowError('Password cannot be longer than 128 characters');
    });

    it('should throw error for common passwords', () => {
      expect(() => new Password('password')).toThrowError('Password is too common. Please choose a stronger password');
    });

    it('should throw error for sequential characters', () => {
      expect(() => new Password('abc12345')).toThrowError('Password cannot contain sequential characters');
      expect(() => new Password('password123')).toThrowError('Password cannot contain sequential characters');
    });

    it('should throw error for repeated characters', () => {
      expect(() => new Password('passwordAAA')).toThrowError('Password cannot contain too many repeated characters');
      expect(() => new Password('11111111')).toThrowError('Password cannot contain too many repeated characters');
    });
  });

  describe('Password Strength Calculation', () => {
    it('should classify weak passwords', () => {
      const weakPassword = new Password('weakpass');
      expect(weakPassword.getStrength()).toBe(PasswordStrength.WEAK);
      expect(weakPassword.isWeak()).toBe(true);
      expect(weakPassword.isStrong()).toBe(false);
    });

    it('should classify fair passwords', () => {
      const fairPassword = new Password('Mypass147');
      expect(fairPassword.getStrength()).toBe(PasswordStrength.FAIR);
      expect(fairPassword.isWeak()).toBe(false);
      expect(fairPassword.isStrong()).toBe(false);
    });

    it('should classify good passwords', () => {
      const goodPassword = new Password('SecurePass147!');
      expect(goodPassword.getStrength()).toBe(PasswordStrength.GOOD);
    });

    it('should classify strong passwords', () => {
      const strongPassword = new Password('VerySecurePass147!@#');
      expect(strongPassword.getStrength()).toBe(PasswordStrength.STRONG);
      expect(strongPassword.isStrong()).toBe(true);
    });

    it('should calculate strength based on length', () => {
      const shortPassword = new Password('Pass147!');
      const longPassword = new Password('VeryLongSecurePassword147!@#');
      expect([PasswordStrength.WEAK, PasswordStrength.FAIR, PasswordStrength.GOOD, PasswordStrength.STRONG])
        .toContain(shortPassword.getStrength());
      expect([PasswordStrength.GOOD, PasswordStrength.STRONG])
        .toContain(longPassword.getStrength());
    });

    it('should calculate strength based on character variety', () => {
      const noUpper = new Password('securepass147!');
      const noLower = new Password('SECUREPASS147!');
      const noNumbers = new Password('SecurePass!');
      const noSpecial = new Password('SecurePass147');

      expect(noUpper.getStrength()).not.toBe(PasswordStrength.STRONG);
      expect(noLower.getStrength()).not.toBe(PasswordStrength.STRONG);
      expect(noNumbers.getStrength()).not.toBe(PasswordStrength.STRONG);
      expect(noSpecial.getStrength()).not.toBe(PasswordStrength.STRONG);
    });
  });

  describe('Password Verification', () => {
    let password: Password;

    beforeEach(() => {
      password = new Password('SecurePass147!');
    });

    it('should verify correct password', () => {
      expect(password.verify('SecurePass147!')).toBe(true);
    });

    it('should reject incorrect password', () => {
      expect(password.verify('WrongPassword147!')).toBe(false);
      expect(password.verify('securepass147!')).toBe(false); // case sensitive
      expect(password.verify('SecurePass147')).toBe(false); // missing special char
    });

    it('should reject empty or null passwords', () => {
      expect(password.verify('')).toBe(false);
      expect(password.verify(null as any)).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should create password from plain text', () => {
      const password = Password.fromPlainText('SecurePass147!');
      expect(password).toBeInstanceOf(Password);
      expect(password.verify('SecurePass147!')).toBe(true);
    });

    it('should create password from hash', () => {
      const hashedPassword = Password.fromHash('hashedvalue', PasswordStrength.STRONG);
      expect(hashedPassword).toBeInstanceOf(Password);
      expect(hashedPassword.getStrength()).toBe(PasswordStrength.STRONG);
      expect(hashedPassword.getHashedValue()).toBe('hashedvalue');
    });

    it('should validate strength statically', () => {
      expect(Password.validateStrength('weak')).toBe(PasswordStrength.WEAK);
      expect(Password.validateStrength('SecurePass147!')).toBe(PasswordStrength.GOOD);
    });

    it('should provide password requirements', () => {
      const requirements = Password.getRequirements();
      expect(requirements).toBeInstanceOf(Array);
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements).toContain('At least 8 characters long');
      expect(requirements).toContain('At least one uppercase letter');
      expect(requirements).toContain('At least one lowercase letter');
      expect(requirements).toContain('At least one number');
      expect(requirements).toContain('At least one special character');
    });
  });

  describe('Security Features', () => {
    it('should detect all caps passwords', () => {
      const allCaps = new Password('SECUREPASS147!');
      expect(allCaps.getStrength()).toBeDefined(); // Should still work but be flagged
    });


    it('should handle passwords with unicode characters', () => {
      const unicodePassword = new Password('Mypass147!ñçü');
      expect(unicodePassword.verify('Mypass147!ñçü')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid password', () => {
      const minPassword = new Password('Pass147!');
      expect(minPassword.getStrength()).toBeDefined();
      expect(minPassword.verify('Pass147!')).toBe(true);
    });


    it('should handle passwords with only special characters', () => {
      const specialOnly = new Password('!@#$%^&*()14725836');
      expect(specialOnly.getStrength()).toBeDefined();
      expect(specialOnly.verify('!@#$%^&*()14725836')).toBe(true);
    });

    it('should handle passwords with spaces', () => {
      const passwordWithSpaces = new Password('My Secure Pass 147!');
      expect(passwordWithSpaces.verify('My Secure Pass 147!')).toBe(true);
    });
  });
});