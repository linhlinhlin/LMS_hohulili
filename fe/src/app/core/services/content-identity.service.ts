import { Injectable, inject } from '@angular/core';
import { OfflineStorageService } from './offline-storage.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class ContentIdentityService {
    private offlineStorage = inject(OfflineStorageService);
    private authService = inject(AuthService);
    private readonly CDN_BASE_URL = '/api/v1/files/view/'; // Adjust based on FileView logic

    /**
     * Resolves a Content Block UUID to a usable URL.
     * Logic:
     * 1. Check if Offline Mode & Image is in IDB -> Return Blob URL
     * 2. If Online -> Return CDN URL with Token (SOTA for 403 fix)
     */
    resolveUrl(uuid: string): string {
        if (!uuid) return '';

        // Check if it's already a full URL (legacy)
        if (uuid.startsWith('http') || uuid.startsWith('assets/')) {
            return uuid;
        }

        const token = this.authService.getToken();
        const baseUrl = `${this.CDN_BASE_URL}${uuid}`;

        return token ? `${baseUrl}?token=${token}` : baseUrl;
    }

    /**
     * Resolves the thumbnail URL for a video or generic file
     */
    resolveThumbnail(uuid: string): string {
        const token = this.authService.getToken();
        const baseUrl = `${this.CDN_BASE_URL}${uuid}/thumbnail`;
        return token ? `${baseUrl}?token=${token}` : baseUrl;
    }
}
