import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * CKEditor5 Upload Adapter that POSTs images to the server
 * instead of embedding them as Base64 data URLs.
 *
 * This prevents DB bloat (5MB image → 6.7MB base64 string in courseInformation).
 * Images are stored in R2/local storage and referenced by URL.
 */
export class ServerUploadAdapter {
  constructor(
    private loader: any,
    private http: HttpClient,
    private apiUrl: string
  ) {}

  upload(): Promise<{ default: string }> {
    return this.loader.file.then((file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'editor-images');
      return firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v3/files/upload/editor`, formData)
      ).then(res => ({ default: res.file?.url ?? '' }));
    });
  }

  abort() {}
}

/**
 * Factory function that creates a CKEditor5 plugin for server-side image uploads.
 * Captures HttpClient and apiUrl via closure since CKEditor plugins run outside Angular DI.
 *
 * Usage:
 *   editorConfig.extraPlugins = [createServerUploadPlugin(this.http, environment.apiUrl)];
 */
export function createServerUploadPlugin(http: HttpClient, apiUrl: string) {
  return function ServerUploadPlugin(editor: any) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) =>
      new ServerUploadAdapter(loader, http, apiUrl);
  };
}
