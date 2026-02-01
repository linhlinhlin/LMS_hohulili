/**
 * Upload API Endpoints - V3
 * Standardized RESTful endpoints for File Upload operations
 * Backend: FileUploadControllerV3 @ /api/v3/files
 */
export const UPLOAD_ENDPOINTS = {
  // === Direct Upload ===
  MULTIPART: '/api/v3/files/upload',

  // === Signed URL (Pre-signed upload) ===
  SIGNED_URL: '/api/v3/files/presign',

  // === Validation ===
  VALIDATE: '/api/v3/files/validate',

  // === Delete ===
  DELETE: '/api/v3/files',
  DELETE_BY_KEY: (fileKey: string) => `/api/v3/files/${encodeURIComponent(fileKey)}`
} as const;
