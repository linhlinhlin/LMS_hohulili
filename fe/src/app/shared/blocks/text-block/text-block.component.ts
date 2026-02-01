import { Component, input, signal, effect, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextBlockData } from '../block-types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-text-block',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="prose max-w-none" [innerHTML]="safeHtml"></div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class TextBlockComponent {
    data = input.required<TextBlockData>();
    safeHtml = signal<SafeHtml>('');

    constructor(private sanitizer: DomSanitizer) {
        // Effect to transform data when it changes
        effect(() => {
            const value = this.data();
            if (value && value.html) {
                this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(value.html));
            }
        });
    }
}
