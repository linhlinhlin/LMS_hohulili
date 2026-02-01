/**
 * File Endpoints - Centralized API paths
 * @see FileControllerV3, FileUploadControllerV3
 */
export const FILE_ENDPOINTS = {
    // Upload
    UPLOAD: '/api/v3/files/upload',
    UPLOAD_MULTIPLE: '/api/v3/files/upload/multiple',

    // Operations
    CONFIRM: '/api/v3/files/confirm',
    DELETE: (fileId: string) => `/api/v3/files/${fileId}`,

    // Access
    STREAM: (fileId: string) => `/api/v3/files/stream/${fileId}`,
    DOWNLOAD: (fileId: string) => `/api/v3/files/download/${fileId}`,
    INFO: (fileId: string) => `/api/v3/files/${fileId}/info`,

    // Batch
    DELETE_BATCH: '/api/v3/files/batch/delete',
} as const;
