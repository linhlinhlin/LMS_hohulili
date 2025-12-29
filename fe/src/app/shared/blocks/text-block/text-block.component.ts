<<<<<<< HEAD
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextBlockData } from '../block-types';
=======
import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextBlockData } from '../block-types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
>>>>>>> fix/image

@Component({
    selector: 'app-text-block',
    standalone: true,
    imports: [CommonModule],
<<<<<<< HEAD
    template: `<div [innerHTML]="data.html"></div>`
})
export class TextBlockComponent {
    @Input() data!: TextBlockData;
=======
    template: `
    <div class="prose max-w-none" [innerHTML]="safeHtml"></div>
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
>>>>>>> fix/image
}
