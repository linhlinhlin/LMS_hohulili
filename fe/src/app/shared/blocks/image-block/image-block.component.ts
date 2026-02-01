import { Component, input, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageBlockData } from '../block-types';
import { AuthImagePipe } from '../../pipes/auth-image.pipe';

@Component({
  selector: 'app-image-block',
  standalone: true,
  imports: [CommonModule, AuthImagePipe],
  template: `
    <figure class="my-6">
        <img 
        [src]="imageUrl() | authImage" 
        [alt]="data().caption || 'Content Image'"
        class="rounded-lg shadow-md max-w-full h-auto mx-auto object-cover transition-opacity duration-300"
        loading="lazy"
        (error)="handleError($event)"
        >
        @if (data().caption) {
          <figcaption class="text-center text-sm text-gray-500 mt-2 italic">{{ data().caption }}</figcaption>
        }
    </figure>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ImageBlockComponent {
  data = input.required<ImageBlockData>();

  imageUrl = computed(() => {
    const d = this.data();
    return d.url || d.file?.url || null;
  });

  handleError(event: any) {
    event.target.style.display = 'none';
  }
}
