import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextBlockData } from '../block-types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-text-block',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="prose max-w-none text-gray-800 dark:text-gray-200" [innerHTML]="safeHtml"></div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class TextBlockComponent {
    @Input() set data(value: TextBlockData) {
        if (value && value.html) {
            // In a real app, strict sanitization happens in the Worker/Backend.
            // Here we trust the pipe or use simple bypass for demo (Backend Jsoup handles XSS).
            this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(value.html);
        }
    }

    safeHtml: SafeHtml = '';

    constructor(private sanitizer: DomSanitizer) { }
}
