import { Component, signal, computed, inject, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VideoPlayerConfig {
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  volume?: number;
  playbackRate?: number;
  startTime?: number;
  endTime?: number;
}

export interface VideoPlayerState {
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-real-video-player',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="relative bg-black rounded-xl overflow-hidden">
      <!-- Video Element -->
      <video #videoElement
             [src]="config().src"
             [poster]="config().poster"
             [autoplay]="config().autoplay"
             [muted]="config().muted"
             [loop]="config().loop"
             [preload]="config().preload || 'metadata'"
             (loadstart)="onLoadStart()"
             (loadeddata)="onLoadedData()"
             (canplay)="onCanPlay()"
             (play)="onPlay()"
             (pause)="onPause()"
             (ended)="onEnded()"
             (timeupdate)="onTimeUpdate()"
             (volumechange)="onVolumeChange()"
             (ratechange)="onRateChange()"
             (error)="onError($event)"
             (waiting)="onWaiting()"
             (canplaythrough)="onCanPlayThrough()"
             class="w-full h-full object-cover">
        <p class="text-white p-4">Trình duyệt của bạn không hỗ trợ video HTML5.</p>
      </video>

      <!-- Loading Overlay -->
      @if (state().isLoading) {
        <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div class="text-center text-white">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p class="text-lg">Đang tải video...</p>
          </div>
        </div>
      }

      <!-- Error Overlay -->
      @if (state().hasError) {
        <div class="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="text-center text-white p-6">
            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-xl font-semibold mb-2">Lỗi phát video</h3>
            <p class="text-gray-300 mb-4">{{ state().errorMessage || 'Không thể tải video' }}</p>
            <button (click)="retryLoad()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Thử lại
            </button>
          </div>
        </div>
      }

      <!-- Controls Overlay -->
      @if (config().controls !== false) {
        <div class="absolute inset-0 flex flex-col justify-between opacity-0 hover:opacity-100 transition-opacity duration-300"
             (mouseenter)="showControls()"
             (mouseleave)="hideControls()">
          
          <!-- Top Controls -->
          <div class="flex justify-between items-center p-4 bg-gradient-to-b from-black to-transparent">
            <div class="flex items-center space-x-4">
              <button (click)="toggleFullscreen()"
                      class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L5 13.586V12a1 1 0 01-2 0v4a1 1 0 001 1h4a1 1 0 010-2H6.414l2.293-2.293a1 1 0 111.414 1.414L13.586 15H12a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <span class="text-white text-sm">{{ formatTime(state().currentTime) }}</span>
                <span class="text-gray-400 text-sm">/</span>
                <span class="text-white text-sm">{{ formatTime(state().duration) }}</span>
              </div>
              
              <button (click)="togglePictureInPicture()"
                      class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Bottom Controls -->
          <div class="p-4 bg-gradient-to-t from-black to-transparent">
            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="relative">
                <div class="w-full h-1 bg-gray-600 rounded-full cursor-pointer"
                     (click)="seekTo($event)">
                  <div class="h-1 bg-blue-500 rounded-full transition-all duration-200"
                       [style.width.%]="progressPercentage()"></div>
                </div>
                <div class="absolute top-0 h-1 bg-transparent cursor-pointer"
                     [style.left.%]="progressPercentage()"
                     (click)="seekTo($event)">
                  <div class="w-3 h-3 bg-blue-500 rounded-full transform -translate-y-1"></div>
                </div>
              </div>
            </div>

            <!-- Control Buttons -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Play/Pause -->
                <button (click)="togglePlay()"
                        class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  @if (state().isPlaying) {
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  } @else {
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                    </svg>
                  }
                </button>

                <!-- Rewind 10s -->
                <button (click)="rewind(10)"
                        class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                  </svg>
                </button>

                <!-- Forward 10s -->
                <button (click)="forward(10)"
                        class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                </button>

                <!-- Volume -->
                <div class="flex items-center space-x-2">
                  <button (click)="toggleMute()"
                          class="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                    @if (state().isMuted || state().volume === 0) {
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L5.617 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.617l2.766-2.816a1 1 0 011-.108zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L5.617 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.617l2.766-2.816a1 1 0 011-.108zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path>
                      </svg>
                    }
                  </button>
                  
                  <div class="w-20 h-1 bg-gray-600 rounded-full cursor-pointer"
                       (click)="setVolume($event)">
                    <div class="h-1 bg-blue-500 rounded-full transition-all duration-200"
                         [style.width.%]="state().volume * 100"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-4">
                <!-- Playback Speed -->
                <div class="flex items-center space-x-2">
                  <span class="text-white text-sm">Tốc độ:</span>
                  <select (change)="setPlaybackRate($event)"
                          [value]="state().playbackRate"
                          class="bg-transparent text-white text-sm border border-gray-600 rounded px-2 py-1">
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <!-- Quality -->
                <div class="flex items-center space-x-2">
                  <span class="text-white text-sm">Chất lượng:</span>
                  <select (change)="setQuality($event)"
                          class="bg-transparent text-white text-sm border border-gray-600 rounded px-2 py-1">
                    <option value="auto">Tự động</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Play Button Overlay (when paused and no controls) -->
      @if (!state().isPlaying && !state().isLoading && !state().hasError && config().controls === false) {
        <div class="absolute inset-0 flex items-center justify-center">
          <button (click)="togglePlay()"
                  class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200 backdrop-blur-sm">
            <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RealVideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  @Input() config = signal<VideoPlayerConfig>({
    src: '',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
    preload: 'metadata',
    volume: 1,
    playbackRate: 1
  });

  @Output() stateChange = new EventEmitter<VideoPlayerState>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() playEvent = new EventEmitter<void>();
  @Output() pauseEvent = new EventEmitter<void>();
  @Output() endedEvent = new EventEmitter<void>();
  @Output() errorEvent = new EventEmitter<string>();

  state = signal<VideoPlayerState>({
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isPlaying: false,
    isMuted: false,
    isLoading: false,
    hasError: false
  });

  private controlsTimeout?: number;
  private isControlsVisible = signal(true);

  ngOnInit(): void {
    this.initializeVideo();
  }

  ngOnDestroy(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  private initializeVideo(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    // Set initial properties
    video.volume = this.config().volume || 1;
    video.playbackRate = this.config().playbackRate || 1;
    
    if (this.config().startTime !== undefined) {
      video.currentTime = this.config().startTime!;
    }

    // Auto-hide controls after 3 seconds
    this.autoHideControls();
  }

  // Event Handlers
  onLoadStart(): void {
    this.state.update(s => ({ ...s, isLoading: true, hasError: false }));
  }

  onLoadedData(): void {
    this.state.update(s => ({ ...s, isLoading: false }));
  }

  onCanPlay(): void {
    this.state.update(s => ({ ...s, isLoading: false }));
  }

  onPlay(): void {
    this.state.update(s => ({ ...s, isPlaying: true }));
    this.playEvent.emit();
    this.stateChange.emit(this.state());
  }

  onPause(): void {
    this.state.update(s => ({ ...s, isPlaying: false }));
    this.pauseEvent.emit();
    this.stateChange.emit(this.state());
  }

  onEnded(): void {
    this.state.update(s => ({ ...s, isPlaying: false }));
    this.endedEvent.emit();
    this.stateChange.emit(this.state());
  }

  onTimeUpdate(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    this.state.update(s => ({ ...s, currentTime: video.currentTime }));
    this.timeUpdate.emit(video.currentTime);
    this.stateChange.emit(this.state());
  }

  onVolumeChange(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    this.state.update(s => ({ 
      ...s, 
      volume: video.volume, 
      isMuted: video.muted 
    }));
    this.stateChange.emit(this.state());
  }

  onRateChange(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    this.state.update(s => ({ ...s, playbackRate: video.playbackRate }));
    this.stateChange.emit(this.state());
  }

  onError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const error = video.error;
    let errorMessage = 'Lỗi không xác định';

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video bị hủy';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Lỗi mạng';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Lỗi giải mã video';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Định dạng video không được hỗ trợ';
          break;
      }
    }

    this.state.update(s => ({ 
      ...s, 
      hasError: true, 
      errorMessage,
      isLoading: false 
    }));
    this.errorEvent.emit(errorMessage);
    this.stateChange.emit(this.state());
  }

  onWaiting(): void {
    this.state.update(s => ({ ...s, isLoading: true }));
  }

  onCanPlayThrough(): void {
    this.state.update(s => ({ ...s, isLoading: false }));
  }

  // Control Methods
  togglePlay(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  rewind(seconds: number): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    video.currentTime = Math.max(0, video.currentTime - seconds);
  }

  forward(seconds: number): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    video.currentTime = Math.min(video.duration, video.currentTime + seconds);
  }

  seekTo(event: MouseEvent): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    video.currentTime = percentage * video.duration;
  }

  toggleMute(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    video.muted = !video.muted;
  }

  setVolume(event: MouseEvent): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    video.volume = percentage;
    video.muted = percentage === 0;
  }

  setPlaybackRate(event: Event): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const target = event.target as HTMLSelectElement;
    video.playbackRate = parseFloat(target.value);
  }

  setQuality(event: Event): void {
    const target = event.target as HTMLSelectElement;
    console.log('Quality changed to:', target.value);
    // Implement quality change logic
  }

  toggleFullscreen(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  }

  togglePictureInPicture(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture();
    }
  }

  retryLoad(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    this.state.update(s => ({ ...s, hasError: false, isLoading: true }));
    video.load();
  }

  // UI Methods
  showControls(): void {
    this.isControlsVisible.set(true);
    this.autoHideControls();
  }

  hideControls(): void {
    this.isControlsVisible.set(false);
  }

  private autoHideControls(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    
    this.controlsTimeout = window.setTimeout(() => {
      if (this.state().isPlaying) {
        this.hideControls();
      }
    }, 3000);
  }

  // Computed Properties
  progressPercentage = computed(() => {
    const state = this.state();
    if (state.duration === 0) return 0;
    return (state.currentTime / state.duration) * 100;
  });

  // Utility Methods
  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}