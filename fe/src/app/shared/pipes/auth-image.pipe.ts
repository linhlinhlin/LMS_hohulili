import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Pipe({
    name: 'authImage',
    standalone: true
})
export class AuthImagePipe implements PipeTransform {
    private http = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);

    transform(urlOrId: string | null): Observable<SafeUrl | string> {
        if (!urlOrId) return of('assets/placeholder.png');

        let url = urlOrId;
        // Check if it's already a full URL or just a UUID
        if (!urlOrId.startsWith('http')) {
            // Assume UUID, construct URL
            // Using Files View endpoint
            url = `${environment.apiUrl}/api/v1/files/view/${urlOrId}`;
        }

        // Check if it is a Blob URL or Data URL (already local)
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return of(this.sanitizer.bypassSecurityTrustUrl(url));
        }

        // Fetch with HttpClient (which adds Authorization Header via Interceptor)
        return this.http.get(url, { responseType: 'blob' }).pipe(
            map(blob => {
                const objectUrl = URL.createObjectURL(blob);
                return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
            }),
            catchError(err => {
                console.error('AuthImagePipe Error', err);
                return of('assets/placeholder.png');
            })
        );
    }
}
