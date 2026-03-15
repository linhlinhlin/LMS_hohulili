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
  | { kind: 'hls'; url: string };

@Component({
  selector: 'app-adaptive-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="relative h-full w-full bg-black">
      <video
        #videoElement
        [poster]="posterUrl() || null"
        controls
        controlsList="nodownload"
        class="h-full w-full object-contain"
        [class.opacity-0]="isLoading() && !error()"
        (loadedmetadata)="onLoadedMetadata($event)"
        (timeupdate)="onTimeUpdate($event)"
        (play)="onPlay()"
        (pause)="onPause()"
        (ended)="onEnded()"
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
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-white">
          <div class="max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-5 text-center shadow-xl">
            <p class="text-base font-semibold">Không tải được video</p>
            <p class="mt-2 text-sm text-slate-300">{{ errorText }}</p>
            <button
              type="button"
              (click)="retry()"
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

  constructor() {
    effect(() => {
      const videoRef = this.videoElement();
      const sourceKey = [
        this.lessonId(),
        this.sectionId() ?? '',
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

      if (source.kind === 'hls') {
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
    if (this.offlineVideoUrl()) {
      return { kind: 'native', url: this.offlineVideoUrl()! };
    }

    if (this.streamVideoUid()) {
      const playUrl = await this.resolveSignedPlaybackUrl();
      if (playUrl) {
        return { kind: 'hls', url: playUrl };
      }
    }

    const rawUrl = this.rawVideoUrl();
    if (!rawUrl) {
      return null;
    }

    return {
      kind: rawUrl.includes('.m3u8') || rawUrl.includes('videodelivery.net') ? 'hls' : 'native',
      url: rawUrl,
    };
  }

  private async resolveSignedPlaybackUrl(): Promise<string | null> {
    const sectionId = this.sectionId();
    if (sectionId) {
      try {
        const response: any = await firstValueFrom(this.sectionApi.getStreamPlayUrl(sectionId));
        return response?.playUrl ?? response?.data?.playUrl ?? null;
      } catch {
        // Fall back to legacy lesson endpoint below.
      }
    }

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/v3/lessons/${this.lessonId()}/video/play`)
      );
      return response?.playUrl ?? response?.data?.playUrl ?? null;
    } catch {
      return null;
    }
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
