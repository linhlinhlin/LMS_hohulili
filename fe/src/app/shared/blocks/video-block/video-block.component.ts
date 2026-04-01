import { Component, input, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { VideoBlockData } from '../block-types';
import { AuthImagePipe } from '../../pipes/auth-image.pipe';
import { QuizVideoPlayerComponent } from './quiz-video-player.component';

@Component({
  selector: 'app-video-block',
  imports: [AuthImagePipe, QuizVideoPlayerComponent],
  template: `
    <figure class="my-4">
      @if (assetId()) {
        <!-- Adaptive streaming via Shaka Player -->
        <app-quiz-video-player
          [videoAssetId]="assetId()"
          [rawVideoUrl]="videoUrl()"
        />
      } @else if (videoUrl()) {
        <!-- Native fallback for legacy/dev mode -->
        <video
          [src]="videoUrl() | authImage"
          controls
          preload="metadata"
          class="rounded-lg shadow-md max-w-full mx-auto bg-black"
          style="max-height: 400px;"
          (error)="handleError($event)"
        >
          Trình duyệt không hỗ trợ phát video.
        </video>
      } @else {
        <div class="text-center text-sm text-gray-400 py-8 bg-gray-50 rounded-lg border border-gray-200">
          Video không khả dụng
        </div>
      }
      @if (data().caption) {
        <figcaption class="text-center text-sm text-gray-500 mt-2 italic">{{ data().caption }}</figcaption>
      }
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class VideoBlockComponent {
  data = input.required<VideoBlockData>();

  assetId = computed(() => {
    const d = this.data();
    return d.videoAssetId || d.assetId || null;
  });

  videoUrl = computed(() => {
    const d = this.data();
    return d.url || d.file?.url || null;
  });

  handleError(event: any) {
    const el = event.target as HTMLVideoElement;
    el.style.display = 'none';
    const fallback = document.createElement('div');
    fallback.className = 'text-center text-sm text-gray-400 py-8 bg-gray-50 rounded-lg border border-gray-200';
    fallback.textContent = 'Không thể tải video';
    el.parentElement?.insertBefore(fallback, el);
  }
}
