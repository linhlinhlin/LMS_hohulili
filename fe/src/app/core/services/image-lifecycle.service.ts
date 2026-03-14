import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ContentIdentityService } from './content-identity.service';

export interface UploadResult {
    uuid: string; // The temporary UUID (or final if backend handles it directly)
    url: string;  // Preview URL
}

@Injectable({
    providedIn: 'root'
})
export class ImageLifecycleService {
    private http = inject(HttpClient);

    // Temporary storage for UUIDs uploaded during this session
    private tempUuids: Set<string> = new Set();

    /**
     * Uploads a file to the Temporary Zone.
     * Returns a UUID that can be used in [IMG:uuid] tags.
     */
    uploadTemp(file: File): Observable<UploadResult> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'editor-image'); // Standardize type

        // SOTA: Use the Editor endpoint which uploads to Cloudflare R2
        return this.http.post<any>('/api/v3/files/upload/editor', formData).pipe(
            map(response => {
                // Backend returns EditorJS-native format: { success: 1, file: { url, id } }
                const uuid = response.file?.uuid || response.file?.id;
                const url = response.file?.url;

                if (!uuid) {
                    throw new Error('Upload failed: No ID returned');
                }

                if (!url) {
                    throw new Error('Upload failed: No URL returned');
                }

                this.tempUuids.add(uuid);

                // Store the UUID -> URL mapping for later use by ContentIdentityService and ParseTagPipe
                this.imageUrlsMap.set(uuid, url);
                ContentIdentityService.registerImageUrl(uuid, url);

                return {
                    uuid: uuid,
                    url: url // Now using R2 CDN URL directly
                };
            })
        );
    }

    // Store UUID -> R2 URL mappings
    private imageUrlsMap = new Map<string, string>();

    // Get URL for a UUID (used by components to render images)
    getImageUrl(uuid: string): string | undefined {
        return this.imageUrlsMap.get(uuid);
    }

    /**
     * Confirms that questions/content have been saved.
     * Backend should move these UUIDs from Temp to Permanent.
     */
    confirm(uuids: string[]): Observable<boolean> {
        // Optimization: Only confirm UUIDs that we know are temp
        const toConfirm = uuids.filter(id => this.tempUuids.has(id));

        if (toConfirm.length === 0) return of(true);

        return this.http.post('/api/v3/files/confirm', { ids: toConfirm }).pipe(
            map(() => {
                toConfirm.forEach(id => this.tempUuids.delete(id));
                return true;
            }),
            catchError(() => of(false))
        );
    }

    /**
     * Cleans up local tracking.
     * (Backend job cleans up physical files if not confirmed)
     */
    clearSession() {
        this.tempUuids.clear();
    }
}
