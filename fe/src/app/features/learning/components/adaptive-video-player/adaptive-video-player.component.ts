import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { SectionApi } from '../../../../api/client/section.api';
import { QoETrackerService } from '../../../../core/services/qoe-tracker.service';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';

type ResolvedVideoSource =
  | { kind: 'native'; url: string }
  | { kind: 'adaptive'; url: string };

@Component({
  selector: 'app-adaptive-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="relative h-full w-full bg-black" data-testid="adaptive-video-player">
      <video
        #videoElement
        data-testid="adaptive-video-element"
        aria-label="Trinh phat video bai hoc"
        [poster]="posterUrl() || null"
        controls
        controlsList="nodownload"
        playsinline
        webkit-playsinline
        preload="metadata"
        crossorigin="anonymous"
        class="h-full w-full object-contain"
        [class.opacity-0]="isLoading() && !error()"
        (loadedmetadata)="onLoadedMetadata($event)"
        (timeupdate)="onTimeUpdate($event)"
        (play)="onPlay()"
        (pause)="onPause()"
        (ended)="onEnded()"
        (error)="onVideoError($event)"
        (waiting)="onBufferStart()"
        (playing)="onPlaying()">
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>

      @if (isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white">
          <div class="flex items-center gap-3 rounded-xl bg-slate-900/80 px-4 py-3 text-sm">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"></span>
            <span>Đang chuẩn bị video thích ứng...</span>
          </div>
        </div>
      }

      @if (error(); as errorText) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-white" data-testid="adaptive-video-error">
          <div class="max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-5 text-center shadow-xl">
            <p class="text-base font-semibold">Không tải được video</p>
            <p class="mt-2 text-sm text-slate-300">{{ errorText }}</p>
            <button
              type="button"
              (click)="retry()"
              aria-label="Thu tai lai video"
              class="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Thử lại
            </button>
          </div>
        </div>
      }

      @if (qualityLabel()) {
        <div class="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white" data-testid="adaptive-video-quality">
          {{ qualityLabel() }}
        </div>
      }

      @if (showNetworkHint()) {
        <div class="absolute bottom-3 left-3 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-slate-950">
          Mạng yếu, hệ thống đang ưu tiên phát ổn định
        </div>
      }
    </div>
  `,
})
export class AdaptiveVideoPlayerComponent {
  private readonly http = inject(HttpClient);
  private readonly sectionApi = inject(SectionApi);
  private readonly tracker = inject(WatchedSegmentsTracker);
  private readonly heartbeat = inject(HeartbeatTracker);
  private readonly qoe = inject(QoETrackerService);
  private readonly videoProgressApi = inject(VideoProgressApi);

  readonly lessonId = input.required<string>();
  readonly sectionId = input<string | null>(null);
  readonly videoAssetId = input<string | null>(null);
  readonly videoSourceKind = input<string | null>(null);
  readonly rawVideoUrl = input<string | null>(null);
  readonly streamVideoUid = input<string | null>(null);
  readonly offlineVideoUrl = input<string | null>(null);
  readonly posterUrl = input<string | null>(null);

  readonly videoEnded = output<void>();

  private readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private readonly sourceLoadToken = signal(0);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly qualityLabel = signal<string | null>(null);
  readonly showNetworkHint = computed(() => {
    const metrics = this.qoe.metrics();
    const rebufferCount = metrics?.rebufferCount ?? 0;
    const effectiveType = typeof navigator !== 'undefined'
      ? ((navigator as any)?.connection?.effectiveType as string | undefined)
      : undefined;
    return rebufferCount > 1 || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
  });

  private shakaPlayer: any = null;
  private playbackStartedAtMs: number | null = null;
  private totalPlayTimeMs = 0;
  private startupRecorded = false;
  private offlineBlobUrl: string | null = null;
  private attemptedOfflineBlobFallback = false;
  private readonly offlineBlobFallbackLimitBytes = 220 * 1024 * 1024;

  constructor() {
    effect(() => {
      const videoRef = this.videoElement();
      const sourceKey = [
        this.lessonId(),
        this.sectionId() ?? '',
        this.videoAssetId() ?? '',
        this.videoSourceKind() ?? '',
        this.rawVideoUrl() ?? '',
        this.streamVideoUid() ?? '',
        this.offlineVideoUrl() ?? '',
      ].join('|');

      if (!videoRef || !sourceKey) {
        return;
      }

      this.sourceLoadToken.update((value) => value + 1);
      void this.loadVideoSource(this.sourceLoadToken());
    });
  }

  async retry(): Promise<void> {
    this.sourceLoadToken.update((value) => value + 1);
    await this.loadVideoSource(this.sourceLoadToken());
  }

  async ngOnDestroy(): Promise<void> {
    this.finishPlaybackSession();
    await this.destroyShakaPlayer();
    this.revokeOfflineBlobUrl();
  }

  onLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    const sectionId = this.getTrackingSectionId();
    if (!video || !sectionId) {
      return;
    }

    this.tracker.startTracking(this.lessonId(), sectionId, video.duration || 0);
    this.restoreResumePosition(sectionId, video);
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }
    this.tracker.recordSecond(video.currentTime);
  }

  onPlay(): void {
    const sectionId = this.getTrackingSectionId();
    if (!sectionId) {
      return;
    }

    if (this.playbackStartedAtMs == null) {
      this.playbackStartedAtMs = performance.now();
    }
    this.heartbeat.start(this.lessonId(), sectionId, 'VIDEO');
  }

  onPause(): void {
    this.accumulatePlayTime();
    this.heartbeat.stop();
  }

  onEnded(): void {
    this.finishPlaybackSession();
    this.videoEnded.emit();
  }

  onVideoError(event: Event): void {
    void this.handleVideoError(event.target as HTMLVideoElement | null);
  }

  onBufferStart(): void {
    this.qoe.recordBufferStart();
  }

  onPlaying(): void {
    this.qoe.recordBufferEnd();
    if (!this.startupRecorded) {
      this.qoe.recordStartup();
      this.startupRecorded = true;
    }
    this.isLoading.set(false);
  }

  private async loadVideoSource(loadToken: number): Promise<void> {
    const videoRef = this.videoElement()?.nativeElement;
    if (!videoRef) {
      return;
    }

    this.finishPlaybackSession();
    await this.destroyShakaPlayer();
    this.error.set(null);
    this.isLoading.set(true);
    this.qualityLabel.set(null);
    this.startupRecorded = false;
    this.attemptedOfflineBlobFallback = false;
    this.revokeOfflineBlobUrl();
    this.qoe.startSession(this.lessonId());

    try {
      const source = await this.resolveVideoSource();
      if (loadToken !== this.sourceLoadToken()) {
        return;
      }

      if (!source) {
        this.error.set('Nguồn phát cho video này hiện chưa sẵn sàng.');
        this.isLoading.set(false);
        return;
      }

      if (source.kind === 'adaptive') {
        await this.initializeShaka(videoRef, source.url);
      } else {
        videoRef.src = source.url;
        videoRef.load();
        this.isLoading.set(false);
      }
    } catch (error) {
      this.qoe.recordError();
      this.error.set(error instanceof Error ? error.message : 'Không thể chuẩn bị video.');
      this.isLoading.set(false);
    }
  }

  private async resolveVideoSource(): Promise<ResolvedVideoSource | null> {
    const normalizedOfflineUrl = this.normalizeOfflineVideoUrl(this.offlineVideoUrl());
    if (normalizedOfflineUrl) {
      if (this.shouldPreferOfflineBlobPlayback()) {
        const blobUrl = await this.createOfflineBlobUrl(normalizedOfflineUrl);
        if (blobUrl) {
          this.attemptedOfflineBlobFallback = true;
          return { kind: 'native', url: blobUrl };
        }
      }
      return { kind: 'native', url: normalizedOfflineUrl };
    }

    if (this.shouldUseAdaptivePlayback()) {
      const playUrl = await this.resolveAdaptivePlayUrl();
      if (playUrl) {
        return { kind: 'adaptive', url: playUrl };
      }
    }

    if (this.streamVideoUid()) {
      const playUrl = await this.resolveLegacyStreamPlaybackUrl();
      if (playUrl) {
        return { kind: 'adaptive', url: playUrl };
      }
    }

    const rawUrl = this.rawVideoUrl();
    if (!rawUrl) {
      return null;
    }

    return {
      kind: rawUrl.includes('.m3u8') || rawUrl.includes('.mpd') || rawUrl.includes('videodelivery.net') ? 'adaptive' : 'native',
      url: rawUrl,
    };
  }

  private shouldUseAdaptivePlayback(): boolean {
    const videoAssetId = this.videoAssetId();
    if (!videoAssetId) {
      return false;
    }

    const sourceKind = this.videoSourceKind();
    return sourceKind === 'ADAPTIVE_R2' || !this.rawVideoUrl();
  }

  private normalizeOfflineVideoUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }

    if (url.startsWith('cache:')) {
      const cacheKey = url.slice('cache:'.length).trim();
      return cacheKey ? `/offline-video/${cacheKey}` : null;
    }

    return url;
  }

  private shouldPreferOfflineBlobPlayback(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
    const isIOSDevice = /iPad|iPhone|iPod/i.test(ua);
    const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
    return isIOSDevice || isIPadDesktopMode;
  }

  private async handleVideoError(video: HTMLVideoElement | null): Promise<void> {
    if (await this.tryOfflineBlobFallback(video)) {
      return;
    }

    this.qoe.recordError();
    const hasOfflineSource = !!this.normalizeOfflineVideoUrl(this.offlineVideoUrl());
    this.error.set(
      hasOfflineSource
        ? 'Video ngoại tuyến này chưa phát được trên trình duyệt hiện tại. Hãy thử cập nhật gói hoặc phát trực tuyến.'
        : 'Không thể phát video này. Vui lòng thử lại.'
    );
    this.isLoading.set(false);
  }

  private async tryOfflineBlobFallback(video: HTMLVideoElement | null): Promise<boolean> {
    if (!video || this.attemptedOfflineBlobFallback) {
      return false;
    }

    const normalizedOfflineUrl = this.normalizeOfflineVideoUrl(this.offlineVideoUrl());
    if (!normalizedOfflineUrl) {
      return false;
    }

    this.attemptedOfflineBlobFallback = true;
    const blobUrl = await this.createOfflineBlobUrl(normalizedOfflineUrl);
    if (!blobUrl) {
      return false;
    }

    this.error.set(null);
    this.isLoading.set(true);
    video.src = blobUrl;
    video.load();
    return true;
  }

  private async createOfflineBlobUrl(offlineUrl: string): Promise<string | null> {
    if (typeof caches === 'undefined' || typeof window === 'undefined') {
      return null;
    }

    try {
      const cache = await caches.open('offline-videos');
      const absoluteUrl = new URL(offlineUrl, window.location.origin);
      const cachedResponse =
        await cache.match(absoluteUrl.toString())
        || await cache.match(offlineUrl)
        || await cache.match(absoluteUrl.pathname);

      if (!cachedResponse) {
        return null;
      }

      const declaredLength = Number(cachedResponse.headers.get('content-length')) || 0;
      if (declaredLength > this.offlineBlobFallbackLimitBytes) {
        return null;
      }

      const blob = await cachedResponse.blob();
      if (blob.size > this.offlineBlobFallbackLimitBytes) {
        return null;
      }

      this.revokeOfflineBlobUrl();
      this.offlineBlobUrl = URL.createObjectURL(blob);
      return this.offlineBlobUrl;
    } catch {
      return null;
    }
  }

  private revokeOfflineBlobUrl(): void {
    if (!this.offlineBlobUrl || typeof URL === 'undefined') {
      this.offlineBlobUrl = null;
      return;
    }

    URL.revokeObjectURL(this.offlineBlobUrl);
    this.offlineBlobUrl = null;
  }

  private async resolveAdaptivePlayUrl(format: 'hls' | 'dash' = 'hls'): Promise<string | null> {
    const sectionId = this.sectionId();
    if (sectionId) {
      try {
        const response: any = await firstValueFrom(this.sectionApi.getVideoPlayUrl(sectionId, format));
        return response?.playUrl ?? response?.data?.playUrl ?? null;
      } catch {
        // Fall back to lesson endpoint below.
      }
    }

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/lessons/${this.lessonId()}/video/play`, {
          params: { format },
        })
      );
      return response?.playUrl ?? response?.data?.playUrl ?? null;
    } catch {
      return null;
    }
  }

  private async resolveLegacyStreamPlaybackUrl(): Promise<string | null> {
    return this.resolveAdaptivePlayUrl('hls');
  }

  private async initializeShaka(videoElement: HTMLVideoElement, manifestUrl: string): Promise<void> {
    const shakaNamespace = await import('shaka-player/dist/shaka-player.compiled');
    const shaka = (shakaNamespace as any).default ?? shakaNamespace;
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
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
      this.syncActiveVariant(player);
    });

    player.addEventListener('buffering', (event: any) => {
      if (event?.buffering) {
        this.onBufferStart();
      } else {
        this.onPlaying();
      }
    });

    player.addEventListener('error', () => {
      this.qoe.recordError();
      this.error.set('Luồng phát thích ứng hiện không phản hồi. Vui lòng thử lại.');
      this.isLoading.set(false);
    });

    await player.load(manifestUrl);
    this.shakaPlayer = player;
    this.syncActiveVariant(player);
    this.isLoading.set(false);
  }

  private syncActiveVariant(player: any): void {
    try {
      const activeVariant = player
        .getVariantTracks()
        .find((track: any) => track.active);
      if (!activeVariant) {
        return;
      }

      if (activeVariant.height) {
        this.qualityLabel.set(`${activeVariant.height}p`);
      }
      if (activeVariant.bandwidth) {
        this.qoe.recordBitrateChange(Math.round(activeVariant.bandwidth / 1_000));
      }
    } catch {
      // Best-effort QoE sync only.
    }
  }

  private async destroyShakaPlayer(): Promise<void> {
    if (!this.shakaPlayer) {
      return;
    }
    try {
      await this.shakaPlayer.destroy();
    } catch {
      // Ignore teardown failures.
    } finally {
      this.shakaPlayer = null;
    }
  }

  private getTrackingSectionId(): string | null {
    return this.sectionId() || `lesson-${this.lessonId()}`;
  }

  private async restoreResumePosition(sectionId: string, video: HTMLVideoElement): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.videoProgressApi.getResumePosition(sectionId));
      const resumePosition = response?.success ? response?.data?.position : response?.position;
      if (typeof resumePosition === 'number' && resumePosition > 0) {
        video.currentTime = resumePosition;
      }
    } catch {
      // Fresh playback is fine.
    }
  }

  private finishPlaybackSession(): void {
    this.accumulatePlayTime();
    this.heartbeat.stop();
    this.tracker.stopTracking();
    this.qoe.finishSession(this.totalPlayTimeMs);
    this.totalPlayTimeMs = 0;
    this.playbackStartedAtMs = null;
    this.startupRecorded = false;
  }

  private accumulatePlayTime(): void {
    if (this.playbackStartedAtMs == null) {
      return;
    }

    this.totalPlayTimeMs += performance.now() - this.playbackStartedAtMs;
    this.playbackStartedAtMs = null;
  }
}
