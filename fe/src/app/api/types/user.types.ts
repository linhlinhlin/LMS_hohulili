/**
 * User Types - Aligned with PostgreSQL `users` table
 * @see V1__lms_consolidated_schema.sql (lines 27-46)
 */

// ============================================
// PostgreSQL ENUM Types
// ============================================

/** PostgreSQL: role VARCHAR(50) CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')) */
export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** PostgreSQL: account_status VARCHAR(50) CHECK (...) */
export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'RESTRICTED';

/** PostgreSQL: provider VARCHAR(50) CHECK (...) */
export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'FACEBOOK';

// ============================================
// Entity Types
// ============================================

/**
 * Complete User entity matching `users` table
 */
export interface User {
    id: string;                        // UUID PRIMARY KEY
    username: string;                  // VARCHAR(255) NOT NULL UNIQUE
    email: string;                     // VARCHAR(255) NOT NULL UNIQUE
    fullName: string;                  // full_name VARCHAR(255) NOT NULL
    role: UserRole;                    // VARCHAR(50) NOT NULL
    enabled: boolean;                  // BOOLEAN NOT NULL DEFAULT true
    accountStatus: AccountStatus | null; // VARCHAR(50) NULLABLE
    statusReason: string | null;       // VARCHAR(255) NULLABLE
    avatar: string | null;             // TEXT NULLABLE
    bio: string | null;                // TEXT NULLABLE
    phoneNumber: string | null;        // VARCHAR(50) NULLABLE
    provider: AuthProvider | null;     // VARCHAR(50) NULLABLE
    providerId: string | null;         // VARCHAR(255) NULLABLE
    lastLogin: string | null;          // TIMESTAMPTZ NULLABLE -> ISO string
    loginCount: number;                // INTEGER DEFAULT 0
    createdAt: string;                 // TIMESTAMPTZ NOT NULL
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * User summary for lists (lightweight)
 */
export interface UserSummary {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    avatar: string | null;
}

/**
 * User profile for editing
 */
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    avatar: string | null;
    bio: string | null;
    phoneNumber: string | null;
}

// ============================================
// Request DTOs
// ============================================

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
}

export interface UpdateUserRequest {
    fullName?: string;
    avatar?: string;
    bio?: string;
    phoneNumber?: string;
}

export interface UpdateUserStatusRequest {
    accountStatus: AccountStatus;
    statusReason?: string;
}

// ============================================
// Response DTOs
// ============================================

export interface UserSearchResult {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    avatar: string | null;
    accountStatus: AccountStatus | null;
}
