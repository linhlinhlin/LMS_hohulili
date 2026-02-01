import { Pipe, PipeTransform, inject } from '@angular/core';
import { ContentIdentityService } from '../../core/services/content-identity.service';

@Pipe({
    name: 'authImage',
    standalone: true,
    pure: true
})
export class AuthImagePipe implements PipeTransform {
    private identityService = inject(ContentIdentityService);

    transform(fileId: string | null): string {
        if (!fileId) return 'assets/placeholder.png';

        // Check if full URL (R2 CDN or other)
        if (fileId.startsWith('http')) {
            return fileId;
        }

        // Use ContentIdentityService to resolve UUID to R2 URL
        return this.identityService.resolveUrl(fileId);
    }
}

