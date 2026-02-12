import {
  Component,
  input,
  OnInit,
  OnDestroy,
  viewChild,
  ElementRef,
  effect,
  signal,
  inject,
  AfterViewInit, ChangeDetectionStrategy } from '@angular/core';

import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import { VideoProgressApi } from '../../../api/client/video-progress.api';
import { WatchedSegmentsTracker } from '../../../features/learning/services/watched-segments-tracker.service';
import { Subscription } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-video-player-tracked',
  imports: [IconComponent],
  template: `
    <div class="video-player-container">
      <!-- Video Player -->
      <div data-vjs-player>
        <video
          #videoPlayer
          class="video-js vjs-default-skin vjs-big-play-centered"
          controls
          preload="auto"
        ></video>
      </div>

      <!-- Progress Overlay -->
      @if (showProgressOverlay()) {
        <div class="progress-overlay" [class.completed]="isCompleted()">
          <div class="progress-info">
            <div class="progress-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  class="progress-bg"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e0e0e0"
                  stroke-width="10"
                />
                <circle
                  class="progress-bar"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4CAF50"
                  stroke-width="10"
                  [style.stroke-dasharray]="getStrokeDashArray()"
                  [style.stroke-dashoffset]="getStrokeDashOffset()"
                />
              </svg>
              <div class="progress-text">{{ currentProgress() }}%</div>
            </div>
            <div class="progress-message">
              @if (isCompleted()) {
                <span class="text-green-600 font-semibold"><app-icon name="circle-check" size="xs" class="mr-1"/> Hoàn thành bài học</span>
              } @else {
                <span class="text-gray-600">Cần xem {{ 75 - currentProgress() }}% nữa</span>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .video-player-container {
        position: relative;
        width: 100%;
        max-width: 100%;
      }

      .video-js {
        width: 100%;
        height: auto;
      }

      .progress-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        transition: all 0.3s ease;
      }

      .progress-overlay.completed {
        background: rgba(76, 175, 80, 0.1);
        border: 2px solid #4CAF50;
      }

      .progress-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .progress-circle {
        position: relative;
        width: 80px;
        height: 80px;
      }

      .progress-circle svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .progress-circle circle {
        transition: stroke-dashoffset 0.3s ease;
      }

      .progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        font-weight: bold;
        color: #4CAF50;
      }

      .progress-message {
        font-size: 13px;
        text-align: center;
        white-space: nowrap;
      }
    `,
  ],
})
export class VideoPlayerTrackedComponent implements OnInit, AfterViewInit, OnDestroy {
  videoPlayerRef = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');

  // Signal inputs - Angular v20+
  videoUrl = input<string>('');
  sectionId = input<string>('');
  lessonId = input<string>('');
  autoplay = input<boolean>(false);
  trackingInterval = input<number>(5000); // Track every 5 seconds

  private videoProgressApi = inject(VideoProgressApi);
  private tracker = inject(WatchedSegmentsTracker);
  private player: Player | null = null;
  private trackingSubscription?: Subscription;
  private lastTrackedTime: number = 0;

  // Signals for state
  currentProgress = signal<number>(0);
  isCompleted = signal<boolean>(false);
  showProgressOverlay = signal<boolean>(true);

  // Effect to load progress when sectionId changes
  constructor() {
    effect(() => {
      const id = this.sectionId();
      if (id) {
        this.loadExistingProgress();
      }
    });
  }

  ngOnInit(): void {
    // Progress loading now handled by effect
  }

  ngAfterViewInit(): void {
    this.initializePlayer();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializePlayer(): void {
    const videoElement = this.videoPlayerRef();
    if (!videoElement?.nativeElement) {
      return;
    }

    // Initialize Video.js
    this.player = videojs(videoElement.nativeElement, {
      controls: true,
      autoplay: this.autoplay(),
      preload: 'auto',
      fluid: true,
      responsive: true,
      sources: [
        {
          src: this.videoUrl(),
          type: this.getVideoType(this.videoUrl()),
        },
      ],
    });

    // Setup event listeners
    this.player.ready(() => {
      this.setupTrackingListeners();
    });

    this.player.on('loadedmetadata', () => {
    });

    this.player.on('error', () => {
    });
  }

  private setupTrackingListeners(): void {
    if (!this.player) return;

    // Start segment tracking on play
    this.player.on('play', () => {
      const duration = Math.floor(this.player?.duration() || 0);
      if (duration > 0) {
        this.tracker.startTracking(this.lessonId(), this.sectionId(), duration);
      }
    });

    // Stop tracking on pause
    this.player.on('pause', () => {
      this.tracker.stopTracking();
    });

    // Stop tracking when video ends
    this.player.on('ended', () => {
      this.tracker.stopTracking();
    });

    // Record seconds and update progress display
    this.player.on('timeupdate', () => {
      if (!this.player) return;
      const currentTime = this.player.currentTime() || 0;
      this.tracker.recordSecond(currentTime);
      this.updateProgressDisplay();
    });
  }

  private updateProgressDisplay(): void {
    if (!this.player) return;

    const localProgress = this.tracker.getLocalProgress();
    if (localProgress > 0) {
      this.currentProgress.set(Math.floor(localProgress));
      this.isCompleted.set(localProgress >= 90);
    }
  }

  private loadExistingProgress(): void {
    this.videoProgressApi.getProgress(this.sectionId()).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const progress = response.data;
          this.currentProgress.set(Math.floor(progress.progressPercent || 0));
          this.isCompleted.set(progress.completed);

          // Resume from last position if video was partially watched
          if (progress.lastPosition > 0 && this.player) {
            setTimeout(() => {
              this.player?.currentTime(progress.lastPosition);
            }, 500);
          }
        }
      },
      error: () => {
      },
    });
  }

  private getVideoType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    const typeMap: { [key: string]: string } = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      mov: 'video/mp4',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };
    return typeMap[extension] || 'video/mp4';
  }

  private cleanup(): void {
    this.tracker.stopTracking();
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
  }

  // Helper methods for SVG progress circle
  getStrokeDashArray(): string {
    const circumference = 2 * Math.PI * 45; // radius = 45
    return `${circumference} ${circumference}`;
  }

  getStrokeDashOffset(): string {
    const circumference = 2 * Math.PI * 45;
    const progress = this.currentProgress() / 100;
    const offset = circumference - progress * circumference;
    return `${offset}`;
  }

  // Public methods for parent components
  play(): void {
    this.player?.play();
  }

  pause(): void {
    this.player?.pause();
  }

  getCurrentTime(): number {
    return this.player?.currentTime() || 0;
  }

  getDuration(): number {
    return this.player?.duration() || 0;
  }

  seekTo(seconds: number): void {
    this.player?.currentTime(seconds);
  }
}
