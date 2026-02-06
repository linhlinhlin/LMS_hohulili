import { Component, input, ChangeDetectionStrategy } from '@angular/core';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-video-player',
  imports: [],
  template: `
    <div class="video-player-container">
      @if (videoUrl()) {
        <video 
          [src]="videoUrl()" 
          controls 
          controlsList="nodownload"
          class="video-element"
          [poster]="posterUrl()">
          Trình duyệt của bạn không hỗ trợ phát video.
        </video>
      } @else {
        <div class="no-video">
          <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
          <p>Không có video</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .video-player-container {
      width: 100%;
      background: #000;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .video-element {
      width: 100%;
      max-height: 500px;
      display: block;
    }

    .no-video {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #9ca3af;
    }

    .icon {
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
    }

    .no-video p {
      font-size: 0.875rem;
      margin: 0;
    }
  `]
})
export class VideoPlayerComponent {
  videoUrl = input<string>('');
  posterUrl = input<string>('');
}
