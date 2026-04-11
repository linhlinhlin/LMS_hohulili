import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Creates a TipTap-compatible upload function matching the existing
 * CKEditor ServerUploadAdapter pattern.
 *
 * Endpoint: POST {apiUrl}/api/v3/files/upload/editor
 * Payload:  FormData { file, folder: 'editor-images' }
 * Returns:  The uploaded file URL string.
 */
export function createTiptapUploadFn(
  http: HttpClient,
  apiUrl: string
): (file: File) => Promise<string> {
  return async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'editor-images');

    const res = await firstValueFrom(
      http.post<any>(`${apiUrl}/api/v3/files/upload/editor`, formData)
    );

    return res?.file?.url || res?.data?.url || res?.url || '';
  };
}
