// Authentication Response (matches backend)
export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Token Refresh Request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Profile Management
export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Error Response (matches backend)
export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Legacy interfaces for backward compatibility (will be removed)
export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  token: string;
  type: string;
  expiresIn: number;
  refreshToken?: string;
}