/**
 * Storage API Endpoints - V3
 * Standardized RESTful endpoints for R2/Cloud Storage operations
 * Backend: FileUploadControllerV3 @ /api/v3/files
 */
export const STORAGE_ENDPOINTS = {
  // === R2 Pre-signed Upload ===
  R2_PRESIGN_UPLOAD: '/api/v3/files/r2/presign',

  // === R2 Direct Operations ===
  R2_UPLOAD: '/api/v3/files/r2/upload',
  R2_DELETE: (fileKey: string) => `/api/v3/files/r2/${encodeURIComponent(fileKey)}`
} as const;
