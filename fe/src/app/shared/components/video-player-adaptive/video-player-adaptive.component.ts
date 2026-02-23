import {
  Component, input, output, signal, computed, viewChild, ElementRef,
  AfterViewInit, OnDestroy, ChangeDetectionStrategy, inject, effect
} from '@angular/core';
import { VideoProgressApi } from '../../../api/client/video-progress.api';
import { WatchedSegmentsTracker } from '../../../features/learning/services/watched-segments-tracker.service';
import { ScreenWakeLockService } from '../../../core/services/screen-wake-lock.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { QoETrackerService } from '../../../core/services/qoe-tracker.service';
import { IconComponent } from '../icon/icon.component';

declare const shaka: any;

export interface AdaptiveVideoConfig {
  src: string;
  poster?: string;
  startTime?: number;
  maxHeight?: number;
  lessonId?: string;
  sectionId?: string;
}

@Component({
  selector: 'app-video-player-adaptive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="relative bg-black rounded-xl overflow-hidden group">
      <video #videoEl
             [poster]="config().poster"
             controls
             controlsList="nodownload"
             class="w-full block"
             playsinline>
      </video>

      <!-- Buffering overlay -->
      @if (isBuffering()) {
        <div class="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div class="animate-spin h-10 w-10 border-3 border-white border-t-transparent rounded-full"></div>
        </div>
      }

      <!-- Network warning -->
      @if (networkWarning()) {
        <div class="absolute top-2 left-2 bg-amber-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"/></svg>
          <span>Kết nối chậm - chất lượng thấp</span>
        </div>
      }

      <!-- Progress overlay -->
      @if (showProgress()) {
        <div class="absolute top-2 right-2 bg-white/95 rounded-lg px-3 py-2 shadow-md text-center"
             [class.border-2]="isCompleted()"
             [class.border-green-500]="isCompleted()">
          <div class="relative w-14 h-14 mx-auto">
            <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#0056D2" stroke-width="8"
                      [attr.stroke-dasharray]="circumference"
                      [attr.stroke-dashoffset]="dashOffset()"
                      class="transition-all duration-300" />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#0056D2]">
              {{ progressPercent() }}%
            </span>
          </div>
          <div class="mt-1 text-xs">
            @if (isCompleted()) {
              <span class="text-green-600 font-medium">Hoàn thành</span>
            } @else {
              <span class="text-gray-500">{{ currentQuality() }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class VideoPlayerAdaptiveComponent implements AfterViewInit, OnDestroy {
  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('videoEl');
  private readonly progressApi = inject(VideoProgressApi);
  private readonly tracker = inject(WatchedSegmentsTracker);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly network = inject(NetworkStatusService);
  private readonly qoe = inject(QoETrackerService);

  config = input.required<AdaptiveVideoConfig>();
  ended = output<void>();

  isBuffering = signal(false);
  networkWarning = signal(false);
  currentQuality = signal('auto');
  progressPercent = signal(0);
  isCompleted = signal(false);
  showProgress = signal(true);

  readonly circumference = 2 * Math.PI * 45;
  readonly dashOffset = computed(() => {
    const progress = this.progressPercent() / 100;
    return this.circumference - progress * this.circumference;
  });

  private player: any = null;
  private shakaLoaded = false;

  constructor() {
    // Load existing progress when config changes
    effect(() => {
      const cfg = this.config();
      if (cfg.sectionId) {
        this.loadExistingProgress(cfg.sectionId);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.loadShaka();
    if (!this.shakaLoaded) return;

    const video = this.videoEl().nativeElement;

    shaka.polyfills.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      this.fallbackToNative(video);
      return;
    }

    this.player = new shaka.Player();
    await this.player.attach(video);

    // Maritime-optimized configuration
    this.player.configure({
      streaming: {
        bufferingGoal: 60,
        rebufferingGoal: 2,
        bufferBehind: 30,
        retryParameters: {
          maxAttempts: 10,
          baseDelay: 1000,
          backoffFactor: 2,
          fuzzFactor: 0.5,
          timeout: 30000,
        },
      },
      abr: {
        enabled: true,
        defaultBandwidthEstimate: 500_000,
        switchInterval: 8,
        bandwidthUpgradeTarget: 0.85,
        bandwidthDowngradeTarget: 0.95,
        restrictions: {
          maxHeight: this.config().maxHeight || Infinity,
        },
      },
    });

    // Buffering events
    this.player.addEventListener('buffering', (e: any) => {
      this.isBuffering.set(e.buffering);
      if (e.buffering) {
        this.qoe.recordBufferStart();
      } else {
        this.qoe.recordBufferEnd();
      }
    });

    // Track quality changes
    this.player.addEventListener('adaptation', () => {
      const tracks = this.player?.getVariantTracks() || [];
      const active = tracks.find((t: any) => t.active);
      if (active) {
        this.currentQuality.set(`${active.height}p`);
        this.networkWarning.set((active.height || 0) <= 360);
        this.qoe.recordBitrateChange(active.bandwidth / 1000);
      }
    });

    // Video element events
    video.addEventListener('play', () => this.onPlay());
    video.addEventListener('pause', () => this.onPause());
    video.addEventListener('ended', () => this.onEnded());
    video.addEventListener('timeupdate', () => this.onTimeUpdate());
    video.addEventListener('loadeddata', () => this.qoe.recordStartup());

    // Load manifest or direct URL
    const src = this.config().src;
    try {
      this.qoe.startSession(this.config().lessonId || 'unknown');
      await this.player.load(src, this.config().startTime);
    } catch (e: any) {
      // If HLS/DASH fails, fall back to native
      if (e.code !== shaka.util.Error.Code.OPERATION_ABORTED) {
        this.fallbackToNative(video);
      }
    }
  }

  ngOnDestroy(): void {
    this.tracker.stopTracking();
    this.wakeLock.release();
    this.player?.destroy();
    this.player = null;
  }

  // ─── Private Methods ───────────────────────────────────────────────

  private async loadShaka(): Promise<void> {
    if (typeof shaka !== 'undefined') {
      this.shakaLoaded = true;
      return;
    }

    try {
      const module = await import('shaka-player/dist/shaka-player.compiled');
      (window as any).shaka = module.default || module;
      this.shakaLoaded = true;
    } catch {
      this.shakaLoaded = false;
    }
  }

  private fallbackToNative(video: HTMLVideoElement): void {
    video.src = this.config().src;
    video.addEventListener('play', () => this.onPlay());
    video.addEventListener('pause', () => this.onPause());
    video.addEventListener('ended', () => this.onEnded());
    video.addEventListener('timeupdate', () => this.onTimeUpdate());
  }

  private onPlay(): void {
    const video = this.videoEl().nativeElement;
    const duration = Math.floor(video.duration || 0);
    const cfg = this.config();

    if (duration > 0 && cfg.lessonId && cfg.sectionId) {
      this.tracker.startTracking(cfg.lessonId, cfg.sectionId, duration);
    }

    this.wakeLock.acquire();
  }

  private onPause(): void {
    this.tracker.stopTracking();
  }

  private onEnded(): void {
    this.tracker.stopTracking();
    this.wakeLock.release();
    this.ended.emit();
  }

  private onTimeUpdate(): void {
    const video = this.videoEl().nativeElement;
    this.tracker.recordSecond(video.currentTime);
    this.updateProgressDisplay();
  }

  private updateProgressDisplay(): void {
    const localProgress = this.tracker.getLocalProgress();
    if (localProgress > 0) {
      this.progressPercent.set(Math.floor(localProgress));
      this.isCompleted.set(localProgress >= 90);
    }
  }

  private loadExistingProgress(sectionId: string): void {
    this.progressApi.getProgress(sectionId).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.progressPercent.set(Math.floor(response.data.progressPercent || 0));
          this.isCompleted.set(response.data.completed);
        }
      },
    });
  }
}
