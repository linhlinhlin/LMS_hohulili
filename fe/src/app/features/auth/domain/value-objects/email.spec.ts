import { Email } from './email';

describe('Email Value Object', () => {
  describe('Creation', () => {
    it('should create a valid email', () => {
      const email = new Email('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should convert email to lowercase', () => {
      const email = new Email('TEST@EXAMPLE.COM');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const email = new Email('  test@example.com  ');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should throw error for invalid email format', () => {
      expect(() => new Email('invalid-email')).toThrow('Error: Invalid email format');
      expect(() => new Email('test@')).toThrow('Error: Invalid email format');
      expect(() => new Email('@example.com')).toThrow('Error: Invalid email format');
    });

    it('should throw error for empty email', () => {
      expect(() => new Email('')).toThrow('Error: Email cannot be empty');
      expect(() => new Email('   ')).toThrow('Error: Email cannot be empty');
    });

    it('should throw error for email too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() => new Email(longEmail)).toThrow('Error: Email is too long');
    });

    it('should throw error for disposable email', () => {
      expect(() => new Email('test@10minutemail.com')).toThrow('Error: Disposable email addresses are not allowed');
    });
  });

  describe('Business Logic', () => {
    let email: Email;

    beforeEach(() => {
      email = new Email('john.doe@university.edu');
    });

    it('should get domain correctly', () => {
      expect(email.getDomain()).toBe('university.edu');
    });

    it('should get local part correctly', () => {
      expect(email.getLocalPart()).toBe('john.doe');
    });

    it('should check if from specific domain', () => {
      expect(email.isFromDomain('university.edu')).toBe(true);
      expect(email.isFromDomain('gmail.com')).toBe(false);
    });

    it('should identify educational emails', () => {
      expect(email.isEducational()).toBe(true);
      const personalEmail = new Email('user@gmail.com');
      expect(personalEmail.isEducational()).toBe(false);
    });

    it('should identify corporate emails', () => {
      expect(email.isCorporate()).toBe(true);
      const personalEmail = new Email('user@gmail.com');
      expect(personalEmail.isCorporate()).toBe(false);
    });

    it('should provide masked email for privacy', () => {
      expect(email.getMaskedEmail()).toBe('jo******@university.edu');
      const shortEmail = new Email('a@b.com');
      expect(shortEmail.getMaskedEmail()).toBe('a*@b.com');
    });

    it('should check equality', () => {
      const sameEmail = new Email('john.doe@university.edu');
      const differentEmail = new Email('jane.doe@university.edu');

      expect(email.equals(sameEmail)).toBe(true);
      expect(email.equals(differentEmail)).toBe(false);
    });

    it('should convert to string', () => {
      expect(email.toString()).toBe('john.doe@university.edu');
    });
  });

  describe('Static Methods', () => {
    it('should create email from string', () => {
      const email = Email.fromString('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('should validate format without creating instance', () => {
      expect(Email.isValidFormat('valid@email.com')).toBe(true);
      expect(Email.isValidFormat('invalid-email')).toBe(false);
      expect(Email.isValidFormat('')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle emails with subdomains', () => {
      const email = new Email('user@mail.university.edu');
      expect(email.getDomain()).toBe('mail.university.edu');
      expect(email.isEducational()).toBe(true);
    });

    it('should handle emails with numbers and special chars', () => {
      const email = new Email('user.name+tag123@university.edu');
      expect(email.getLocalPart()).toBe('user.name+tag123');
      expect(email.getDomain()).toBe('university.edu');
    });

    it('should handle international domains', () => {
      const email = new Email('user@university.edu.vn');
      expect(email.getDomain()).toBe('university.edu.vn');
      expect(email.isEducational()).toBe(true);
    });
  });
});