/**
 * Value Object: Email
 * Immutable object representing email address with business rules
 */
export class Email {
  private readonly value: string;

  constructor(email: string) {
    this.value = email.toLowerCase().trim();
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new Error('Invalid email format');
    }

    if (this.value.length > 254) {
      throw new Error('Email is too long');
    }

    // Check for common disposable email domains (optional business rule)
    const disposableDomains = ['10minutemail.com', 'temp-mail.org', 'guerrillamail.com'];
    const domain = this.value.split('@')[1];
    if (disposableDomains.includes(domain)) {
      throw new Error('Disposable email addresses are not allowed');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Get the email value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Get the domain part of the email
   */
  public getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Get the local part of the email
   */
  public getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Check if email is from a specific domain
   */
  public isFromDomain(domain: string): boolean {
    return this.getDomain() === domain.toLowerCase();
  }

  /**
   * Check if email is from an educational institution
   */
  public isEducational(): boolean {
    const educationalDomains = ['.edu', '.ac.', 'university', 'college', 'school'];
    const domain = this.getDomain();
    return educationalDomains.some(edu => domain.includes(edu));
  }

  /**
   * Check if email is from a corporate domain
   */
  public isCorporate(): boolean {
    const domain = this.getDomain();
    const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return !commonPersonalDomains.includes(domain);
  }

  /**
   * Get masked email for privacy (show first 2 chars and domain)
   */
  public getMaskedEmail(): string {
    const [local, domain] = this.value.split('@');
    const maskedLocal = local.length > 2
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : local + '*';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Check if email matches another email
   */
  public equals(other: Email): boolean {
    return this.value === other.value;
  }

  /**
   * Convert to string
   */
  public toString(): string {
    return this.value;
  }

  /**
   * Create Email from string (factory method)
   */
  public static fromString(email: string): Email {
    return new Email(email);
  }

  /**
   * Validate email format without creating instance
   */
  public static isValidFormat(email: string): boolean {
    try {
      new Email(email);
      return true;
    } catch {
      return false;
    }
  }
}