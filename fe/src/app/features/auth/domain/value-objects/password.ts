import { PasswordStrength } from '../types';

/**
 * Value Object: Password
 * Immutable object representing password with business rules and security validation
 */
export class Password {
  private readonly hashedValue: string;
  private readonly strength: PasswordStrength;

  constructor(password: string) {
    this.validate(password);
    this.strength = this.calculateStrength(password);
    this.hashedValue = this.hashPassword(password);
  }

  /**
   * Business Rules Validation
   */
  private validate(password: string): void {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password cannot be longer than 128 characters');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common. Please choose a stronger password');
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      throw new Error('Password cannot contain sequential characters');
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      throw new Error('Password cannot contain too many repeated characters');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Get password strength
   */
  public getStrength(): PasswordStrength {
    return this.strength;
  }

  /**
   * Check if password is strong
   */
  public isStrong(): boolean {
    return this.strength === PasswordStrength.STRONG;
  }

  /**
   * Check if password is weak
   */
  public isWeak(): boolean {
    return this.strength === PasswordStrength.WEAK;
  }

  /**
   * Get hashed password value
   */
  public getHashedValue(): string {
    return this.hashedValue;
  }

  /**
   * Verify password against hash
   */
  public verify(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }
    return this.hashPassword(password) === this.hashedValue;
  }

  /**
   * Get password requirements description
   */
  public static getRequirements(): string[] {
    return [
      'At least 8 characters long',
      'At least one uppercase letter',
      'At least one lowercase letter',
      'At least one number',
      'At least one special character',
      'No sequential characters (abc, 123)',
      'No repeated characters (aaa, 111)',
      'Not a common password'
    ];
  }

  /**
   * Validate password strength without creating instance
   */
  public static validateStrength(password: string): PasswordStrength {
    return this.calculateStrengthStatic(password);
  }

  /**
   * Calculate password strength
   */
  private calculateStrength(password: string): PasswordStrength {
    return Password.calculateStrengthStatic(password);
  }

  /**
   * Static method to calculate password strength
   */
  private static calculateStrengthStatic(password: string): PasswordStrength {
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Complexity
    if (password.length >= 16 && /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) {
      score += 2;
    }

    // Determine strength
    if (score >= 7) return PasswordStrength.STRONG;
    if (score >= 5) return PasswordStrength.GOOD;
    if (score >= 3) return PasswordStrength.FAIR;
    return PasswordStrength.WEAK;
  }

  /**
   * Hash password (simplified for demo - in real app use bcrypt or similar)
   */
  private hashPassword(password: string): string {
    // In a real application, use proper password hashing like bcrypt
    // This is a simplified version for demonstration
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Check for sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = ['abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
                      'ijk', 'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr',
                      'qrs', 'rst', 'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz',
                      '123', '234', '345', '456', '567', '678', '789', '890'];

    return sequences.some(seq => password.toLowerCase().includes(seq));
  }

  /**
   * Check for repeated characters
   */
  private hasRepeatedChars(password: string): boolean {
    // Check for 3 or more repeated characters
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create Password from plain text
   */
  public static fromPlainText(password: string): Password {
    return new Password(password);
  }

  /**
   * Create Password from hash (for existing users)
   */
  public static fromHash(hash: string, strength: PasswordStrength = PasswordStrength.GOOD): Password {
    const instance = Object.create(Password.prototype);
    instance.hashedValue = hash;
    instance.strength = strength;
    return instance;
  }
}