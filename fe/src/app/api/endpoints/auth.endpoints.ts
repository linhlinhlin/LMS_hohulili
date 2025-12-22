import { API } from './api.config';

export const AUTH_ENDPOINTS = {
  LOGIN: `${API.BASE}/auth/login`,
  REGISTER: `${API.BASE}/auth/register`,
  LOGOUT: `${API.BASE}/auth/logout`,
  REFRESH: `${API.BASE}/auth/refresh`,
  ME: `${API.BASE}/auth/me`,
  PROFILE: `${API.BASE}/auth/profile`,
  PASSWORD: `${API.BASE}/auth/password`
} as const;
