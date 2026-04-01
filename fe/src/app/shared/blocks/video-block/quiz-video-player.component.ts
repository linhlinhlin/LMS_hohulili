import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { VideoAssetApi } from '../../../api/client/video-asset.api';
import { firstValueFrom } from 'rxjs';

type ResolvedSource =
  | { kind: 'native'; url: string }
  | { kind: 'adaptive'; url: string };

/**
 * Lightweight Shaka Player wrapper for quiz video blocks.
 * Stripped-down version of AdaptiveVideoPlayerComponent:
 * - No lesson tracking, heartbeat, QoE, resume position
 * - Dynamic Shaka import (lazy-loaded, same bundle as lesson player)
 * - Graceful fallback to native <video> when asset not READY
 */
@Component({
  selector: 'app-quiz-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="relative w-full bg-black rounded-lg overflow-hidden">
      <video
        #videoElement
        controls
        controlsList="nodownload"
        playsinline
        preload="metadata"
        crossorigin="anonymous"
        class="w-full"
        style="max-height: 400px;"
        [class.opacity-0]="isLoading() && !error()"
        (error)="onVideoError()">
        Trình duyệt không hỗ trợ phát video.
      </video>

      @if (isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white">
          <div class="flex items-center gap-3 rounded-xl bg-slate-900/80 px-4 py-3 text-sm">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"></span>
            <span>Đang chuẩn bị video...</span>
          </div>
        </div>
      }

      @if (error(); as errorText) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-white">
          <div class="max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-5 text-center shadow-xl">
            <p class="text-base font-semibold">Không tải được video</p>
            <p class="mt-2 text-sm text-slate-300">{{ errorText }}</p>
            <button type="button" (click)="retry()"
              class="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Thử lại
            </button>
          </div>
        </div>
      }

      @if (qualityLabel()) {
        <div class="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white">
          {{ qualityLabel() }}
        </div>
      }
    </div>
  `
})
export class QuizVideoPlayerComponent {
  private readonly videoAssetApi = inject(VideoAssetApi);

  readonly videoAssetId = input<string | null>(null);
  readonly rawVideoUrl = input<string | null>(null);

  private readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly qualityLabel = signal<string | null>(null);

  private shakaPlayer: any = null;
  private loadToken = 0;

  constructor() {
    effect(() => {
      const videoRef = this.videoElement();
      const assetId = this.videoAssetId();
      const rawUrl = this.rawVideoUrl();

      if (!videoRef) return;

      // Trigger reload when inputs change
      void this.loadVideoSource(assetId, rawUrl);
    });
  }

  async ngOnDestroy(): Promise<void> {
    await this.destroyShakaPlayer();
  }

  async retry(): Promise<void> {
    await this.loadVideoSource(this.videoAssetId(), this.rawVideoUrl());
  }

  onVideoError(): void {
    if (!this.isLoading()) {
      this.error.set('Không thể phát video này.');
    }
  }

  private async loadVideoSource(assetId: string | null, rawUrl: string | null): Promise<void> {
    const videoEl = this.videoElement()?.nativeElement;
    if (!videoEl) return;

    const token = ++this.loadToken;
    await this.destroyShakaPlayer();
    this.error.set(null);
    this.isLoading.set(true);
    this.qualityLabel.set(null);

    try {
      const source = await this.resolveSource(assetId, rawUrl);
      if (token !== this.loadToken) return;

      if (!source) {
        this.error.set('Nguồn phát video chưa sẵn sàng.');
        this.isLoading.set(false);
        return;
      }

      if (source.kind === 'adaptive') {
        await this.initializeShaka(videoEl, source.url);
      } else {
        videoEl.src = source.url;
        videoEl.load();
        this.isLoading.set(false);
      }
    } catch (err) {
      if (token !== this.loadToken) return;
      this.error.set(err instanceof Error ? err.message : 'Không thể chuẩn bị video.');
      this.isLoading.set(false);
    }
  }

  private async resolveSource(assetId: string | null, rawUrl: string | null): Promise<ResolvedSource | null> {
    // Priority 1: Adaptive streaming via VideoAsset
    if (assetId) {
      try {
        const res: any = await firstValueFrom(this.videoAssetApi.getPlayUrl(assetId, 'hls'));
        const data = res?.data ?? res;
        if (data?.playUrl) {
          return { kind: 'adaptive', url: data.playUrl };
        }
      } catch {
        // Asset not ready or endpoint failed — fall through to raw URL
      }
    }

    // Priority 2: Raw URL fallback
    if (rawUrl) {
      const isManifest = rawUrl.includes('.m3u8') || rawUrl.includes('.mpd');
      return { kind: isManifest ? 'adaptive' : 'native', url: rawUrl };
    }

    return null;
  }

  private async initializeShaka(videoElement: HTMLVideoElement, manifestUrl: string): Promise<void> {
    const shakaNamespace = await import('shaka-player/dist/shaka-player.compiled');
    const shaka = (shakaNamespace as any).default ?? shakaNamespace;
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      // Fallback to native
      videoElement.src = manifestUrl;
      videoElement.load();
      this.isLoading.set(false);
      return;
    }

    const player = new shaka.Player(videoElement);
    player.configure({
      abr: {
        enabled: true,
        defaultBandwidthEstimate: 900_000,
        switchInterval: 8,
        bandwidthDowngradeTarget: 0.95,
        bandwidthUpgradeTarget: 0.85,
      },
      streaming: {
        bufferingGoal: 30,
        rebufferingGoal: 8,
        bufferBehind: 30,
        segmentPrefetchLimit: 2,
        retryParameters: {
          baseDelay: 1_000,
          backoffFactor: 2,
          fuzzFactor: 0.5,
          maxAttempts: 4,
          timeout: 30_000,
        },
      },
    });

    player.addEventListener('adaptation', () => {
      this.syncQuality(player);
    });

    player.addEventListener('error', () => {
      this.error.set('Luồng phát thích ứng hiện không phản hồi.');
      this.isLoading.set(false);
    });

    await player.load(manifestUrl);
    this.shakaPlayer = player;
    this.syncQuality(player);
    this.isLoading.set(false);
  }

  private syncQuality(player: any): void {
    try {
      const active = player.getVariantTracks().find((t: any) => t.active);
      if (active?.height) {
        this.qualityLabel.set(`${active.height}p`);
      }
    } catch {}
  }

  private async destroyShakaPlayer(): Promise<void> {
    if (this.shakaPlayer) {
      try { await this.shakaPlayer.destroy(); } catch {}
      this.shakaPlayer = null;
    }
  }
}
