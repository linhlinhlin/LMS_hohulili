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
        effect(() => {
            const value = this.data();
            if (value && value.html) {
                this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(value.html));
            }
        });
    }
}
