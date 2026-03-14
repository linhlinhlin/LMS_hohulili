import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'parseTag'
})
export class ParseTagPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);

    // Map to store UUID -> R2 URL mappings (populated when images are uploaded)
    private static imageUrlMap = new Map<string, string>();

    static registerImageUrl(uuid: string, url: string) {
        this.imageUrlMap.set(uuid, url);
    }

    transform(content: string): SafeHtml {
        if (!content) return '';

        // Replace [IMG:uuid] with <img src="...">
        const parsedContent = content.replace(/\[IMG:([a-f0-9\-]+)\]/g, (match, uuid) => {
            // First check if we have a registered R2 URL for this UUID
            const registeredUrl = ParseTagPipe.imageUrlMap.get(uuid);
            if (registeredUrl) {
                return `<img src="${registeredUrl}" alt="Image" style="max-height: 100px; display: inline-block; vertical-align: middle; border-radius: 4px;">`;
            }

            // Fallback: show placeholder with UUID for debugging
            return `<img src="/icons/icon-192x192.png" alt="Image ${uuid}" title="Image not found: ${uuid}" style="max-height: 100px; display: inline-block; vertical-align: middle; border-radius: 4px; opacity: 0.5;">`;
        });

        return this.sanitizer.bypassSecurityTrustHtml(parsedContent);
    }
}
