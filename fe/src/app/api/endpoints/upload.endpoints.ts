import { API } from './api.config';

export const UPLOAD_ENDPOINTS = {
  MULTIPART: `${API.BASE}/uploads/file`,
  SIGNED_URL: `${API.BASE}/uploads/signed-url`,
  VALIDATE: `${API.BASE}/uploads/validate`,
  DELETE: `${API.BASE}/uploads/file`
} as const;
