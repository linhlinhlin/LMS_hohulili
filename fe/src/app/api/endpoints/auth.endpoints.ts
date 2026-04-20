export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v3/auth/login',
  LOOKUP: '/api/v3/auth/lookup',
  GOOGLE_LOGIN: '/api/v3/auth/google',
  GOOGLE_CONFIG: '/api/v3/auth/google/config',
  REGISTER: '/api/v3/auth/register',
  LOGOUT: '/api/v3/auth/logout',
  REFRESH: '/api/v3/auth/refresh',
  ME: '/api/v3/auth/me',
  PROFILE: '/api/v3/auth/profile',
  PASSWORD: '/api/v3/auth/password',
  FORGOT_PASSWORD: '/api/v3/auth/forgot-password'
} as const;
