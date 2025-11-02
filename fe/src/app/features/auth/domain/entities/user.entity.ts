import {
  UserId,
  PasswordHash,
  UserRole,
  UserStatus,
  AuthMethod,
  ValidationResult
} from '../types';
import { Email } from '../value-objects/email';
import { Password } from '../value-objects/password';

/**
 * Domain Entity: User
 * Represents a user in the authentication domain with rich business logic
 */
export class User {
  constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly passwordHash: PasswordHash,
    public readonly role: UserRole,
    public readonly status: UserStatus,
    public readonly authMethod: AuthMethod,
    public readonly profile: UserProfile,
    public readonly security: UserSecurity,
    public readonly metadata: UserMetadata
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid user: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if user is active
   */
  public isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user is suspended
   */
  public isSuspended(): boolean {
    return this.status === UserStatus.SUSPENDED;
  }

  /**
   * Check if user is pending verification
   */
  public isPendingVerification(): boolean {
    return this.status === UserStatus.PENDING_VERIFICATION;
  }

  /**
   * Check if user has admin role
   */
  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user has teacher role
   */
  public isTeacher(): boolean {
    return this.role === UserRole.TEACHER;
  }

  /**
   * Check if user has student role
   */
  public isStudent(): boolean {
    return this.role === UserRole.STUDENT;
  }

  /**
   * Check if user can authenticate
   */
  public canAuthenticate(): boolean {
    return this.isActive() && !this.isSuspended();
  }

  /**
   * Check if user needs email verification
   */
  public needsEmailVerification(): boolean {
    return this.isPendingVerification() && !this.security.emailVerified;
  }

  /**
   * Check if user has role
   */
  public hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  public hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  /**
   * Get user permissions based on role
   */
  public getPermissions(): string[] {
    const basePermissions = ['read'];

    switch (this.role) {
      case UserRole.ADMIN:
        return [...basePermissions, 'write', 'delete', 'manage_users', 'manage_system'];
      case UserRole.TEACHER:
        return [...basePermissions, 'write', 'manage_courses', 'manage_students', 'grade_assignments'];
      case UserRole.STUDENT:
        return [...basePermissions, 'enroll_courses', 'submit_assignments'];
      default:
        return basePermissions;
    }
  }

  /**
   * Check if user has permission
   */
  public hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  /**
   * Get user's full name
   */
  public getFullName(): string {
    return `${this.profile.firstName} ${this.profile.lastName}`.trim();
  }

  /**
   * Get user's display name
   */
  public getDisplayName(): string {
    return this.profile.displayName || this.getFullName();
  }

  /**
   * Check if user is recent (registered within last 7 days)
   */
  public isRecent(daysThreshold: number = 7): boolean {
    const now = new Date();
    const registeredAt = this.metadata.createdAt;
    const diffTime = Math.abs(now.getTime() - registeredAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold;
  }

  /**
   * Check if user account is old enough for certain actions
   */
  public isAccountAged(minDays: number = 30): boolean {
    const now = new Date();
    const registeredAt = this.metadata.createdAt;
    const diffTime = Math.abs(now.getTime() - registeredAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= minDays;
  }

  /**
   * Check if password needs to be changed (security policy)
   */
  public needsPasswordChange(maxAgeDays: number = 90): boolean {
    if (!this.security.lastPasswordChange) return false;

    const now = new Date();
    const lastChange = this.security.lastPasswordChange;
    const diffTime = Math.abs(now.getTime() - lastChange.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= maxAgeDays;
  }

  /**
   * Get account age in days
   */
  public getAccountAgeInDays(): number {
    const now = new Date();
    const registeredAt = this.metadata.createdAt;
    const diffTime = Math.abs(now.getTime() - registeredAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get formatted user info
   */
  public getFormattedInfo(): {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    isActive: boolean;
    permissions: string[];
    accountAge: number;
  } {
    return {
      id: this.id,
      email: this.email.toString(),
      name: this.getDisplayName(),
      role: this.getRoleLabel(),
      status: this.getStatusLabel(),
      isActive: this.isActive(),
      permissions: this.getPermissions(),
      accountAge: this.getAccountAgeInDays()
    };
  }

  /**
   * Get role label in Vietnamese
   */
  private getRoleLabel(): string {
    switch (this.role) {
      case UserRole.ADMIN: return 'Quản trị viên';
      case UserRole.TEACHER: return 'Giảng viên';
      case UserRole.STUDENT: return 'Học viên';
      default: return 'Không xác định';
    }
  }

  /**
   * Get status label in Vietnamese
   */
  private getStatusLabel(): string {
    switch (this.status) {
      case UserStatus.ACTIVE: return 'Hoạt động';
      case UserStatus.INACTIVE: return 'Không hoạt động';
      case UserStatus.SUSPENDED: return 'Bị tạm ngừng';
      case UserStatus.PENDING_VERIFICATION: return 'Chờ xác minh';
      default: return 'Không xác định';
    }
  }

  /**
   * Validate user data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Email validation is handled by Email value object

    if (!this.profile.firstName.trim()) {
      errors.push('First name cannot be empty');
    }

    if (!this.profile.lastName.trim()) {
      errors.push('Last name cannot be empty');
    }

    if (this.metadata.createdAt > new Date()) {
      errors.push('Created date cannot be in the future');
    }

    // Business rule validations
    if (this.role === UserRole.ADMIN && !this.isAccountAged(30)) {
      warnings.push('Admin accounts should be at least 30 days old');
    }

    if (this.needsPasswordChange()) {
      warnings.push('Password should be changed for security');
    }

    if (this.security.failedLoginAttempts > 5) {
      warnings.push('Account has multiple failed login attempts');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: UserStatus): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      newStatus,
      this.authMethod,
      this.profile,
      this.security,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated profile
   */
  public withProfile(newProfile: Partial<UserProfile>): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.status,
      this.authMethod,
      { ...this.profile, ...newProfile },
      this.security,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated password
   */
  public withPassword(newPasswordHash: PasswordHash): User {
    return new User(
      this.id,
      this.email,
      newPasswordHash,
      this.role,
      this.status,
      this.authMethod,
      this.profile,
      {
        ...this.security,
        lastPasswordChange: new Date()
      },
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }
}

/**
 * User Profile Information
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

/**
 * User Security Information
 */
export interface UserSecurity {
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastPasswordChange?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  trustedDevices: string[];
}

/**
 * User Metadata
 */
export interface UserMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  preferredLanguage: string;
  timezone: string;
  tags: string[];
}