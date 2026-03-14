import { Injectable, inject } from '@angular/core';
import { OfflineStorageService } from './offline-storage.service';

@Injectable({
    providedIn: 'root'
})
export class ContentIdentityService {
    private offlineStorage = inject(OfflineStorageService);

    // Store UUID -> R2 URL mappings (populated when images are uploaded)
    private static imageUrlMap = new Map<string, string>();

    /**
     * Register a UUID -> URL mapping (called after successful upload)
     */
    static registerImageUrl(uuid: string, url: string) {
        this.imageUrlMap.set(uuid, url);
    }

    /**
     * Get the URL for a UUID
     */
    static getImageUrl(uuid: string): string | undefined {
        return this.imageUrlMap.get(uuid);
    }

    /**
     * Resolves a Content Block UUID to a usable URL.
     * Logic:
     * 1. Check if it's already a full URL -> return as-is
     * 2. Check if we have a registered R2 URL for this UUID -> return it
     * 3. Fallback: return placeholder
     */
    resolveUrl(uuid: string): string {
        if (!uuid) return '';

        // Check if it's already a full URL (R2 CDN URL or legacy)
        if (uuid.startsWith('http') || uuid.startsWith('assets/')) {
            return uuid;
        }

        // Check if we have a registered R2 URL for this UUID
        const registeredUrl = ContentIdentityService.imageUrlMap.get(uuid);
        if (registeredUrl) {
            return registeredUrl;
        }

        // Fallback: placeholder (image not found)
        return '/icons/icon-192x192.png';
    }

    /**
     * Resolves the thumbnail URL for a video or generic file
     */
    resolveThumbnail(uuid: string): string {
        const url = this.resolveUrl(uuid);
        // For R2 URLs, append thumbnail suffix if supported
        return url;
    }
}
