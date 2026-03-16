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
            const rawValue = value.html ?? value.text ?? value.content;
            if (!rawValue) {
                this.safeHtml.set('');
                return;
            }

            const rendered = this.renderTextBlock(rawValue);
            this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(rendered));
        });
    }

    private renderTextBlock(rawValue: string): string {
        const text = rawValue.trim();
        if (!text) {
            return '';
        }

        // Preserve trusted HTML blocks from the editor; wrap plain text payloads safely.
        if (text.includes('<')) {
            return text;
        }

        return `<p>${this.escapeHtml(text)}</p>`;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
