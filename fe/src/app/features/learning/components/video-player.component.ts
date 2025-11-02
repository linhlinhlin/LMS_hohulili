import { Component, ElementRef, ViewChild, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoPlayerService, VideoLesson } from '../services/video-player.service';

@Component({
  selector: 'app-video-player',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="bg-black rounded-lg overflow-hidden shadow-lg" [class.fullscreen]="videoPlayerService.isFullscreen()">
      <!-- Video Container -->
      <div class="relative aspect-video bg-black">
        <video
          #videoElement
          class="w-full h-full object-contain"
          [src]="videoPlayerService.currentVideo()?.videoUrl"
          [muted]="videoPlayerService.isMuted()"
          [volume]="videoPlayerService.volume()"
          [playbackRate]="videoPlayerService.playbackRate()"
          (loadedmetadata)="onVideoLoaded()"
          (timeupdate)="onTimeUpdate()"
          (play)="onPlay()"
          (pause)="onPause()"
          (ended)="onVideoEnded()"
          (click)="togglePlayPause()"
        >
          Your browser does not support the video tag.
        </video>

        <!-- Loading Overlay -->
        @if (!videoPlayerService.isVideoLoaded()) {
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div class="text-white text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Đang tải video...</p>
            </div>
          </div>
        }

        <!-- Play/Pause Overlay -->
        @if (!videoPlayerService.isPlaying() && videoPlayerService.isVideoLoaded()) {
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <button 
              (click)="togglePlayPause()"
              class="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all">
              <svg class="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        }

        <!-- Video Controls Overlay -->
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity duration-300"
             (mouseenter)="showControls()" 
             (mouseleave)="hideControls()">
          
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="w-full bg-gray-600 rounded-full h-1 cursor-pointer" (click)="seekTo($event)">
              <div 
                class="bg-red-600 h-1 rounded-full transition-all duration-100"
                [style.width.%]="videoPlayerService.progressPercentage()">
              </div>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="flex items-center justify-between text-white">
            <div class="flex items-center space-x-4">
              <!-- Play/Pause -->
              <button (click)="togglePlayPause()" class="hover:text-gray-300 transition-colors">
                @if (videoPlayerService.isPlaying()) {
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                } @else {
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                }
              </button>

              <!-- Rewind -->
              <button (click)="seekBackward()" class="hover:text-gray-300 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 18V6l-5.5 6 5.5 6zm.5-12l5.5 6-5.5 6V6z"/>
                </svg>
              </button>

              <!-- Forward -->
              <button (click)="seekForward()" class="hover:text-gray-300 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 6v12l5.5-6L13 6zM6 6v12l5.5-6L6 6z"/>
                </svg>
              </button>

              <!-- Volume -->
              <div class="flex items-center space-x-2">
                <button (click)="toggleMute()" class="hover:text-gray-300 transition-colors">
                  @if (videoPlayerService.isMuted() || videoPlayerService.volume() === 0) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  }
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  [value]="videoPlayerService.volume()"
                  (input)="onVolumeChange($event)"
                  class="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer">
              </div>

              <!-- Time Display -->
              <span class="text-sm">
                {{ videoPlayerService.timeFormatted() }} / {{ videoPlayerService.durationFormatted() }}
              </span>
            </div>

            <div class="flex items-center space-x-4">
              <!-- Playback Speed -->
              <select 
                [value]="videoPlayerService.playbackRate()"
                (change)="onPlaybackRateChange($event)"
                class="bg-transparent text-white text-sm border border-gray-800 rounded px-2 py-1">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>

              <!-- Add Bookmark -->
              <button 
                (click)="addBookmark()"
                class="hover:text-gray-300 transition-colors"
                title="Thêm bookmark">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>

              <!-- Fullscreen -->
              <button (click)="toggleFullscreen()" class="hover:text-gray-300 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
    }
    
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ef4444;
      cursor: pointer;
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ef4444;
      cursor: pointer;
      border: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;
  
  protected videoPlayerService = inject(VideoPlayerService);
  
  private controlsTimeout?: number;

  ngOnInit(): void {
    // Initialize video element
    if (this.videoElement) {
      this.setupVideoElement();
    }
  }

  ngOnDestroy(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  private setupVideoElement(): void {
    const video = this.videoElement.nativeElement;
    
    // Set initial properties
    video.volume = this.videoPlayerService.volume();
    video.playbackRate = this.videoPlayerService.playbackRate();
  }

  onVideoLoaded(): void {
    const video = this.videoElement.nativeElement;
    this.videoPlayerService.updateDuration(video.duration);
  }

  onTimeUpdate(): void {
    const video = this.videoElement.nativeElement;
    this.videoPlayerService.updateCurrentTime(video.currentTime);
  }

  onPlay(): void {
    this.videoPlayerService.play();
  }

  onPause(): void {
    this.videoPlayerService.pause();
  }

  onVideoEnded(): void {
    this.videoPlayerService.pause();
    // Auto-play next video or show completion message
  }

  togglePlayPause(): void {
    const video = this.videoElement.nativeElement;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  seekTo(event: MouseEvent): void {
    const video = this.videoElement.nativeElement;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * video.duration;
    
    this.videoPlayerService.seekTo(newTime);
    video.currentTime = newTime;
  }

  seekForward(): void {
    this.videoPlayerService.seekForward();
    this.videoElement.nativeElement.currentTime = this.videoPlayerService.currentTime();
  }

  seekBackward(): void {
    this.videoPlayerService.seekBackward();
    this.videoElement.nativeElement.currentTime = this.videoPlayerService.currentTime();
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    this.videoPlayerService.setVolume(volume);
    this.videoElement.nativeElement.volume = volume;
  }

  toggleMute(): void {
    this.videoPlayerService.toggleMute();
    this.videoElement.nativeElement.muted = this.videoPlayerService.isMuted();
  }

  onPlaybackRateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const rate = parseFloat(target.value);
    this.videoPlayerService.setPlaybackRate(rate);
    this.videoElement.nativeElement.playbackRate = rate;
  }

  toggleFullscreen(): void {
    this.videoPlayerService.toggleFullscreen();
    
    if (this.videoPlayerService.isFullscreen()) {
      this.videoElement.nativeElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  addBookmark(): void {
    const title = prompt('Nhập tiêu đề bookmark:');
    if (title) {
      this.videoPlayerService.addBookmark(title);
    }
  }

  showControls(): void {
    // Controls are shown via CSS hover
  }

  hideControls(): void {
    // Controls are hidden via CSS hover
  }
}
