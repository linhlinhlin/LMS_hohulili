export interface UploadedFile {
  id: string;
  url: string;
  originalName: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  category?: string;
  thumbnailUrl?: string;
}
