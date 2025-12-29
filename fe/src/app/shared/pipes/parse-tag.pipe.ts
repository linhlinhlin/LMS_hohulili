import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Pipe({
    name: 'parseTag',
    standalone: true
})
export class ParseTagPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/api/v1/files/view`;

    transform(content: string): SafeHtml {
        if (!content) return '';

        // Replace [IMG:uuid] with <img src="...">
        const parsedContent = content.replace(/\[IMG:([a-f0-9\-]+)\]/g, (match, uuid) => {
            const token = this.authService.getToken();
            const url = `${this.apiUrl}/${uuid}?token=${token}`;
            // Add simplified styling for options
            return `<img src="${url}" alt="Option Image" style="max-height: 100px; display: inline-block; vertical-align: middle; border-radius: 4px;">`;
        });

        return this.sanitizer.bypassSecurityTrustHtml(parsedContent);
    }
}
