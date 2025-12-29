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
<<<<<<< HEAD
        if (!fileId) return 'assets/placeholder.png'; // Placeholder
=======
        if (!fileId) return 'assets/placeholder.png'; // Updated placeholder path if needed

        // If explicitly standard URL, usage might vary. 
        // But for [IMG:uuid], input is uuid.
>>>>>>> fix/image

        // Check if full URL
        if (fileId.startsWith('http')) {
            return fileId;
        }

        const token = this.authService.getToken();
        return `${this.apiUrl}/${fileId}?token=${token}`;
    }
}
