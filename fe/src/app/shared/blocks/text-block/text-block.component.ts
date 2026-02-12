import { Component, input, signal, effect, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';

import { TextBlockData } from '../block-types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-text-block',
    imports: [],
    template: `
    <div class="prose max-w-none" [innerHTML]="safeHtml()"></div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class TextBlockComponent {
    private sanitizer = inject(DomSanitizer);

    data = input.required<TextBlockData>();
    safeHtml = signal<SafeHtml>('');

    constructor() {
        // Effect to transform data when it changes
        // Supports both {html: "..."} and {text: "..."} formats
        effect(() => {
            const value = this.data();
            if (!value) return;
            if (value.html) {
                this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(value.html));
            } else if ((value as any).text) {
                // Fallback: plain text from quiz questions / content blocks
                const text = (value as any).text;
                // If text contains HTML tags, render as HTML; otherwise wrap in <p>
                const rendered = text.includes('<') ? text : `<p>${text}</p>`;
                this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(rendered));
            }
        });
    }
}
