// Domain Types for Authentication Feature
// Following Domain-Driven Design principles

export type UserId = string & { readonly __brand: 'UserId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type Email = string & { readonly __brand: 'Email' };
export type PasswordHash = string & { readonly __brand: 'PasswordHash' };
export type RefreshToken = string & { readonly __brand: 'RefreshToken' };
export type AccessToken = string & { readonly __brand: 'AccessToken' };

// User Roles
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

// User Status
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

// Session Status
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

// Authentication Methods
export enum AuthMethod {
  PASSWORD = 'password',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  MICROSOFT = 'microsoft'
}

// Password Strength
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong'
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Authentication Statistics
export interface AuthStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalSessions: number;
  activeSessions: number;
  failedLoginAttempts: number;
}

// Session Filters
export interface SessionFilters {
  status?: SessionStatus[];
  userId?: UserId[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  deviceType?: string[];
}

// User Filters
export interface UserFilters {
  role?: UserRole[];
  status?: UserStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// Sort Options
export interface AuthSortOptions {
  field: 'createdAt' | 'lastLoginAt' | 'email' | 'name' | 'role';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication Events
export enum AuthEventType {
  USER_REGISTERED = 'user_registered',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  PASSWORD_CHANGED = 'password_changed',
  SESSION_EXPIRED = 'session_expired',
  LOGIN_FAILED = 'login_failed'
}

export interface AuthEvent {
  id: string;
  type: AuthEventType;
  userId: UserId;
  sessionId?: SessionId;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}