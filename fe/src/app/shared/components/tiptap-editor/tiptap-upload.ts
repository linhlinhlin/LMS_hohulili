import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PresignedUploadService, type UploadEvent } from '../../../core/services/presigned-upload.service';

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const IMAGE_QUALITY = 0.85;

/**
 * Resize image client-side before upload.
 * Converts to WebP (with JPEG fallback) and caps at 1920×1080.
 */
async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width <= MAX_IMAGE_WIDTH && height <= MAX_IMAGE_HEIGHT) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
            const name = file.name.replace(/\.[^.]+$/, ext);
            resolve(new File([blob], name, { type: blob.type }));
          } else {
            resolve(file);
          }
        },
        'image/webp',
        IMAGE_QUALITY,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Image upload for Tiptap — resize + WebP + presigned upload to R2.
 * Same pipeline as all other uploads in the system.
 */
export function createTiptapUploadFn(
  http: HttpClient,
  apiUrl: string,
  presignedUpload?: PresignedUploadService,
): (file: File) => Promise<string> {
  return async (file: File): Promise<string> => {
    const optimized = await resizeImage(file);

    // Use presigned upload if available (R2 in production)
    if (presignedUpload) {
      const event = await firstValueFrom(
        presignedUpload.upload(optimized, 'editor-images').pipe(
          filter((e): e is Extract<UploadEvent, { type: 'complete' }> => e.type === 'complete'),
        ),
      );
      return event.url;
    }

    // Fallback: direct upload (dev server relay)
    const formData = new FormData();
    formData.append('file', optimized);
    formData.append('folder', 'editor-images');
    const res = await firstValueFrom(
      http.post<any>(`${apiUrl}/api/v3/files/upload/editor`, formData),
    );
    return res?.file?.url || res?.data?.url || res?.url || '';
  };
}

/**
 * Video upload for Tiptap — presigned upload to R2.
 * Uses 'videos' folder (same as lesson/intro video).
 * Dev: server relay. Prod: presigned PUT → R2.
 */
export function createTiptapVideoUploadFn(
  presignedUpload: PresignedUploadService,
): (file: File) => Promise<string> {
  return async (file: File): Promise<string> => {
    const event = await firstValueFrom(
      presignedUpload.upload(file, 'videos').pipe(
        filter((e): e is Extract<UploadEvent, { type: 'complete' }> => e.type === 'complete'),
      ),
    );
    return event.url;
  };
}
