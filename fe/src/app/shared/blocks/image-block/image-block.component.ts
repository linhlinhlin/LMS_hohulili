import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageBlockData } from '../block-types';

@Component({
    selector: 'app-image-block',
    standalone: true,
    imports: [CommonModule],
    template: `
    <figure class="my-6">
      <img 
        [src]="data.url" 
        [alt]="data.caption || 'Content Image'"
        class="rounded-lg shadow-md max-w-full h-auto mx-auto object-cover transition-opacity duration-300"
        loading="lazy"
        (error)="handleError($event)"
      >
      <figcaption *ngIf="data.caption" class="text-center text-sm text-gray-500 mt-2 italic">
        {{ data.caption }}
      </figcaption>
    </figure>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class ImageBlockComponent {
    @Input() data!: ImageBlockData;

    handleError(event: any) {
        // Basic error handling - could show a placeholder
        event.target.style.display = 'none';
    }
}
