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
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import { VideoProgressApi, TrackProgressRequest } from '../../../api/client/video-progress.api';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-video-player-tracked',
  standalone: true,
  imports: [CommonModule],
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
                <span class="text-green-600 font-semibold">✓ Hoàn thành bài học</span>
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
  autoplay = input<boolean>(false);
  trackingInterval = input<number>(5000); // Track every 5 seconds

  private videoProgressApi = inject(VideoProgressApi);
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
      console.error('Video element not found');
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
      console.log('Video player is ready');
      this.setupTrackingListeners();
    });

    this.player.on('loadedmetadata', () => {
      console.log('Video metadata loaded, duration:', this.player?.duration());
    });

    this.player.on('error', (error: any) => {
      console.error('Video player error:', error);
    });
  }

  private setupTrackingListeners(): void {
    if (!this.player) return;

    // Start tracking on play
    this.player.on('play', () => {
      this.startTracking();
    });

    // Pause tracking on pause
    this.player.on('pause', () => {
      this.stopTracking();
      this.trackProgressNow(); // Track immediately when paused
    });

    // Track when video ends
    this.player.on('ended', () => {
      this.stopTracking();
      this.trackProgressNow();
    });

    // Update progress display in real-time
    this.player.on('timeupdate', () => {
      this.updateProgressDisplay();
    });
  }

  private startTracking(): void {
    if (this.trackingSubscription) return;

    // Track progress every N seconds
    this.trackingSubscription = interval(this.trackingInterval()).subscribe(() => {
      this.trackProgressNow();
    });
  }

  private stopTracking(): void {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
      this.trackingSubscription = undefined;
    }
  }

  private trackProgressNow(): void {
    if (!this.player || !this.sectionId()) return;

    const currentTime = Math.floor(this.player.currentTime() || 0);
    const duration = Math.floor(this.player.duration() || 0);

    // Only track if time has changed significantly (at least 1 second)
    if (Math.abs(currentTime - this.lastTrackedTime) < 1) {
      return;
    }

    this.lastTrackedTime = currentTime;

    const request: TrackProgressRequest = {
      sectionId: this.sectionId(),
      currentPosition: currentTime,
      duration,
    };

    this.videoProgressApi.trackProgress(request).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentProgress.set(Math.floor(response.data.progressPercentage));
          this.isCompleted.set(response.data.completed);

          // Log completion event
          if (response.data.completed && !this.isCompleted()) {
            console.log('🎉 Video completed! 75% threshold reached');
          }
        }
      },
      error: (error) => {
        console.error('Failed to track progress:', error);
      },
    });
  }

  private updateProgressDisplay(): void {
    if (!this.player) return;

    const currentTime = this.player.currentTime() || 0;
    const duration = this.player.duration() || 0;

    if (duration > 0) {
      const progress = Math.floor((currentTime / duration) * 100);
      this.currentProgress.set(progress);
    }
  }

  private loadExistingProgress(): void {
    this.videoProgressApi.getProgress(this.sectionId()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const progress = response.data;
          this.currentProgress.set(Math.floor(progress.progressPercentage));
          this.isCompleted.set(progress.completed);

          // Resume from last position if video was partially watched
          if (progress.currentPosition > 0 && this.player) {
            setTimeout(() => {
              this.player?.currentTime(progress.currentPosition);
              console.log(`Resumed from ${progress.currentPosition}s`);
            }, 500);
          }
        }
      },
      error: (error) => {
        console.error('Failed to load existing progress:', error);
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
    this.stopTracking();
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
