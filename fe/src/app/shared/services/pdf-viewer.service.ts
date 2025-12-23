import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Service for handling secure PDF streaming and rendering.
 * Implements SOTA 2025 memory management (URL.revokeObjectURL) 
 * and authorized blob fetching.
 */
@Injectable({ providedIn: 'root' })
export class PdfViewerService {
    private http = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);
    private baseUrl = environment.apiUrl;

    // Store current URL to revoke and avoid memory leaks
    private currentUrl?: string;

    /**
     * Fetches a PDF file as a blob using authorization headers (provided by HttpClient interceptors)
     * and returns a safe resource URL for embedding.
     */
    getSafePdfUrl(fileUrl: string | null): Observable<SafeResourceUrl | null> {
        console.log('[PdfViewerService] getSafePdfUrl called with:', fileUrl);
        if (!fileUrl) {
            console.warn('[PdfViewerService] fileUrl is null or empty');
            return new Observable(observer => observer.next(null));
        }

        // Determine the full URL (handle both relative and absolute paths)
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${this.baseUrl}${fileUrl}`;
        console.log('[PdfViewerService] Fetching from fullUrl:', fullUrl);

        return this.http.get(fullUrl, { responseType: 'blob' }).pipe(
            map(blob => {
                console.log('[PdfViewerService] Blob received:', blob.size, 'bytes, type:', blob.type);
                // Revoke previous URL to prevent memory leaks before creating a new one
                this.cleanup();

                this.currentUrl = URL.createObjectURL(blob);
                console.log('[PdfViewerService] Created objectURL:', this.currentUrl);
                return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentUrl);
            })
        );
    }

    /**
     * Revokes the current blob URL to free up browser memory.
     * Call this in ngOnDestroy of components using this service.
     */
    cleanup() {
        if (this.currentUrl) {
            console.log('[PdfViewerService] Cleaning up URL:', this.currentUrl);
            URL.revokeObjectURL(this.currentUrl);
            this.currentUrl = undefined;
        }
    }
}
