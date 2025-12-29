import { Pipe, PipeTransform, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Pipe({
    name: 'authImage',
    standalone: true,
    pure: true
})
export class AuthImagePipe implements PipeTransform {
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/api/v1/files/view`;

    transform(fileId: string | null): string {
        if (!fileId) return 'assets/placeholder.png';

        // Check if full URL
        if (fileId.startsWith('http')) {
            return fileId;
        }

        // Check if full URL
        if (fileId.startsWith('http')) {
            return fileId;
        }

        const token = this.authService.getToken();
        return `${this.apiUrl}/${fileId}?token=${token}`;
    }
}
