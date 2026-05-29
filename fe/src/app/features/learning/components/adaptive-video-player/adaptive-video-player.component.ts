import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { getCurrentUserId } from '../../../../core/db/lms-offline.db';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { SectionApi } from '../../../../api/client/section.api';
import { LearningActivityApi } from '../../../../api/client/learning-activity.api';
import { QoETrackerService } from '../../../../core/services/qoe-tracker.service';
import { OfflineSyncService } from '../../../../core/services/offline-sync.service';
import { NetworkStatusService } from '../../../../core/services/network-status.service';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { InteractiveVideoLayerComponent } from '../../../../shared/blocks/video-block/interactive-video-layer.component';
import { InteractiveVideoOverlayComponent } from '../../../../shared/blocks/video-block/interactive-video-overlay.component';
import { InteractiveVideoMarkersComponent } from '../../../../shared/blocks/video-block/interactive-video-markers.component';
import { buildInteractiveVideoAnalyticsProjection } from '../../../../core/utils/interactive-video-analytics';
import {
  addInteractiveVideoWatchedRange,
  getDueInteractiveVideoInteraction,
  isInteractiveVideoProgressGateInteraction,
  isInteractiveVideoReviewInteraction,
  resolveInteractiveVideoChoiceTarget,
  resolveInteractiveVideoReviewTarget,
  shouldBlockInteractiveVideoSeek,
} from '../../../../core/utils/interactive-video-runtime';
import type { InteractiveVideoWatchedRange } from '../../../../core/utils/interactive-video-runtime';
import {
  canUseNativeHlsForManifest,
  shouldPreferNativeHlsForManifest,
} from '../../../../core/utils/video-playback-platform';
import {
  extractAdaptivePlaybackHttpStatus,
  isRecoverableAdaptiveStreamError,
  resolvePlaybackManifestFormat,
  shouldRefreshAdaptivePlaybackUrl,
} from '../../../../core/utils/video-stream-recovery';
import type { VideoPlaybackManifestFormat } from '../../../../core/utils/video-stream-recovery';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoRuntimeEvent,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';

type ResolvedVideoSource =
  | { kind: 'native'; url: string }
  | { kind: 'adaptive'; url: string };

interface AdaptivePlaybackSession {
  playUrl: string;
  videoAssetId?: string | null;
  videoSourceKind?: string | null;
  format?: string | null;
  cdnDeliveryMode?: string | null;
  mediaDomainSegmentDeliveryEnabled?: boolean | null;
}

export interface MediaNetworkHintState {
  online: boolean;
  saveDataEnabled: boolean;
  effectiveNetworkType: string | null;
  reportedDownlinkMbps: number | null;
  appBandwidthMbps: number;
  rebufferCount: number;
  totalBufferTimeMs: number;
}

const NOTICEABLE_REBUFFER_COUNT = 2;
const NOTICEABLE_BUFFER_MS = 1_500;
const LOW_REPORTED_DOWNLINK_MBPS = 1.2;
const LOW_APP_BANDWIDTH_MBPS = 1.5;

export function shouldShowMediaNetworkHint(state: MediaNetworkHintState): boolean {
  if (!state.online) {
    return false;
  }

  if (state.saveDataEnabled) {
    return true;
  }

  const effectiveType = state.effectiveNetworkType?.toLowerCase();
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return true;
  }

  const hasPlaybackPain =
    state.rebufferCount >= NOTICEABLE_REBUFFER_COUNT
    && state.totalBufferTimeMs >= NOTICEABLE_BUFFER_MS;

  if (effectiveType === '3g') {
    return hasPlaybackPain
      || (state.reportedDownlinkMbps != null && state.reportedDownlinkMbps < LOW_REPORTED_DOWNLINK_MBPS);
  }

  return hasPlaybackPain && state.appBandwidthMbps < LOW_APP_BANDWIDTH_MBPS;
}

@Component({
  selector: 'app-adaptive-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InteractiveVideoLayerComponent, InteractiveVideoOverlayComponent, InteractiveVideoMarkersComponent],
  template: `
    <div class="flex h-full w-full flex-col bg-black" data-testid="adaptive-video-player"
         (click)="showQualityMenu() && showQualityMenu.set(false)">
      <div class="relative min-h-0 flex-1 bg-black">
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
        (seeking)="onSeeking($event)"
        (seeked)="onSeeked($event)"
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

      <!-- Quality selector (YouTube/Coursera pattern) -->
      <div class="absolute left-3 top-3 z-10">
        @if (showQualityMenu()) {
          <div class="rounded-lg bg-slate-950/90 backdrop-blur-sm py-1 min-w-[140px] shadow-lg">
            <button (click)="selectQuality(null)"
              class="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-white hover:bg-white/10 transition-colors"
              [class.font-bold]="isAutoQuality()">
              <span>Tự động</span>
              @if (isAutoQuality()) { <span class="text-sky-400">✓</span> }
            </button>
            @for (q of availableQualities(); track q.height) {
              <button (click)="selectQuality(q)"
                class="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-white hover:bg-white/10 transition-colors"
                [class.font-bold]="!isAutoQuality() && qualityLabel() === q.height + 'p'">
                <span>{{ q.height }}p</span>
                @if (!isAutoQuality() && qualityLabel() === q.height + 'p') { <span class="text-sky-400">✓</span> }
              </button>
            }
          </div>
        } @else if (qualityLabel()) {
          <button (click)="showQualityMenu.set(true)"
            class="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-950/95 transition-colors cursor-pointer flex items-center gap-1"
            data-testid="adaptive-video-quality">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {{ isAutoQuality() ? 'Tự động' : '' }} {{ qualityLabel() }}
          </button>
        }
      </div>

      <app-interactive-video-layer
        [timeline]="interactiveVideoSpec()?.enabled === false ? [] : (interactiveVideoSpec()?.timeline ?? [])"
        [currentTimeSeconds]="currentTimeSeconds()"
        [durationSeconds]="videoDurationSeconds()"
        [completedInteractionIds]="completedInteractionIdsSnapshot()"
        [activeInteractionId]="activeInteraction()?.id ?? null"
        (interactionSelected)="openInteractiveInteraction($event)" />

      @if (showNetworkHint()) {
        <div
          class="pointer-events-none absolute left-3 z-10 rounded-full bg-amber-400/95 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-lg shadow-black/20"
          [class.top-14]="qualityLabel()"
          [class.top-3]="!qualityLabel()"
          role="status"
          aria-live="polite"
          data-testid="adaptive-video-network-hint">
          Đang ưu tiên phát ổn định
        </div>
      }
      @if (activeInteraction(); as interaction) {
        <app-interactive-video-overlay
          [interaction]="interaction"
          [selectedChoiceId]="selectedChoiceId()"
          [timeline]="interactiveVideoSpec()?.enabled === false ? [] : (interactiveVideoSpec()?.timeline ?? [])"
          (choiceSelected)="onInteractiveChoice($event)"
          (reviewRequested)="onInteractiveReviewRequested()"
          (continueRequested)="onInteractiveContinue()" />
      }
      </div>

      <app-interactive-video-markers
        [timeline]="interactiveVideoSpec()?.enabled === false ? [] : (interactiveVideoSpec()?.timeline ?? [])"
        [durationSeconds]="videoDurationSeconds()"
        [currentTimeSeconds]="currentTimeSeconds()"
        [activeInteractionId]="activeInteraction()?.id ?? null"
        [showUpcomingHint]="false"
        (markerSelected)="seekToInteractiveSecond($event)" />
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
  private readonly learningActivityApi = inject(LearningActivityApi);
  private readonly injector = inject(Injector);
  private readonly network = inject(NetworkStatusService);

  readonly lessonId = input.required<string>();
  readonly sectionId = input<string | null>(null);
  readonly videoAssetId = input<string | null>(null);
  readonly videoSourceKind = input<string | null>(null);
  readonly rawVideoUrl = input<string | null>(null);
  readonly streamVideoUid = input<string | null>(null);
  readonly offlineVideoUrl = input<string | null>(null);
  readonly posterUrl = input<string | null>(null);
  readonly completionThreshold = input<number | undefined>(undefined);
  readonly interactiveVideoSpec = input<InteractiveVideoSpec | null>(null);

  readonly videoEnded = output<void>();
  readonly interactiveEvent = output<InteractiveVideoRuntimeEvent>();

  private readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private readonly sourceLoadToken = signal(0);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly qualityLabel = signal<string | null>(null);
  readonly showQualityMenu = signal(false);
  readonly isAutoQuality = signal(true);
  readonly availableQualities = signal<Array<{ height: number; bandwidth: number }>>([]);
  readonly activeInteraction = signal<InteractiveVideoInteraction | null>(null);
  readonly selectedChoiceId = signal<string | null>(null);
  readonly completedInteractionIdsSnapshot = signal<ReadonlySet<string>>(new Set<string>());
  readonly videoDurationSeconds = signal<number | null>(null);
  readonly currentTimeSeconds = signal(0);
  readonly showNetworkHint = computed(() => {
    const metrics = this.qoe.metrics();
    return shouldShowMediaNetworkHint({
      online: this.network.online(),
      saveDataEnabled: this.network.saveDataEnabled(),
      effectiveNetworkType: this.network.effectiveNetworkType(),
      reportedDownlinkMbps: this.network.reportedDownlinkMbps(),
      appBandwidthMbps: this.network.effectiveBandwidthMbps(),
      rebufferCount: metrics?.rebufferCount ?? 0,
      totalBufferTimeMs: metrics?.totalBufferTimeMs ?? 0,
    });
  });

  private shakaPlayer: any = null;
  private playbackStartedAtMs: number | null = null;
  private totalPlayTimeMs = 0;
  private startupRecorded = false;
  private offlineBlobUrl: string | null = null;
  private attemptedOfflineBlobFallback = false;
  private activeAdaptiveManifestUrl: string | null = null;
  private activeCdnDeliveryMode: string | null = null;
  private activeMediaDomainSegmentDeliveryEnabled: boolean | null = null;
  private attemptedPlaybackUrlRefresh = false;
  private readonly offlineBlobFallbackLimitBytes = 220 * 1024 * 1024;
  private readonly shownInteractionIds = new Set<string>();
  private readonly completedInteractionIds = new Set<string>();
  private watchedRanges: InteractiveVideoWatchedRange[] = [];
  private furthestWatchedSeconds = 0;
  private isSeeking = false;
  private seekStartTimeSeconds = 0;
  private skipNextWatchedMark = false;

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
        this.interactiveVideoSpec()?.timeline.length ?? 0,
      ].join('|');

      if (!videoRef || !sourceKey) {
        return;
      }

      void this.loadVideoSource(this.nextSourceLoadToken());
    });
  }

  async retry(): Promise<void> {
    await this.loadVideoSource(this.nextSourceLoadToken());
  }

  async ngOnDestroy(): Promise<void> {
    this.finishPlaybackSession();
    await this.destroyShakaPlayer();
    this.revokeOfflineBlobUrl();
  }

  onLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (video) {
      this.videoDurationSeconds.set(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
      this.currentTimeSeconds.set(Number.isFinite(video.currentTime) ? video.currentTime : 0);
      this.markInteractiveVideoWatched(video.currentTime);
    }

    const sectionId = this.getTrackingSectionId();
    if (!video || !sectionId) {
      return;
    }

    this.tracker.startTracking(this.lessonId(), sectionId, video.duration || 0, this.completionThreshold());
    this.restoreResumePosition(sectionId, video);
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }
    if (this.isSeeking && this.snapBlockedInteractiveSeek(video)) {
      return;
    }
    const previousTimeSeconds = this.isSeeking ? video.currentTime : this.currentTimeSeconds();
    this.currentTimeSeconds.set(video.currentTime);
    const shouldTrackPlaybackProgress = !this.isSeeking && !this.skipNextWatchedMark;
    if (shouldTrackPlaybackProgress) {
      this.markInteractiveVideoWatched(video.currentTime, previousTimeSeconds);
    }
    if (shouldTrackPlaybackProgress) {
      this.tracker.recordSecond(video.currentTime);
    } else if (!this.isSeeking && this.skipNextWatchedMark) {
      this.skipNextWatchedMark = false;
    }
    this.evaluateInteractiveTimeline(video, previousTimeSeconds);
  }

  onSeeking(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }
    if (!this.isSeeking) {
      this.seekStartTimeSeconds = this.currentTimeSeconds();
    }
    this.isSeeking = true;
    this.snapBlockedInteractiveSeek(video);
  }

  onSeeked(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    this.isSeeking = false;
    if (!video) {
      return;
    }
    const previousTimeSeconds = this.seekStartTimeSeconds;
    this.currentTimeSeconds.set(video.currentTime);
    this.evaluateInteractiveTimeline(video, previousTimeSeconds);
  }

  seekToInteractiveSecond(seconds: number): void {
    const video = this.videoElement()?.nativeElement;
    if (!video || !Number.isFinite(seconds)) {
      return;
    }

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : seconds;
    const target = this.resolveAllowedInteractiveSeekTarget(Math.max(0, Math.min(seconds, duration)));
    this.reopenInteractiveMarkerAtTarget(target);
    this.seekVideoProgrammatically(video, target);
    this.currentTimeSeconds.set(video.currentTime);
    this.evaluateInteractiveTimeline(video);
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
    this.activeAdaptiveManifestUrl = null;
    this.activeCdnDeliveryMode = null;
    this.activeMediaDomainSegmentDeliveryEnabled = null;
    this.attemptedPlaybackUrlRefresh = false;
    this.videoDurationSeconds.set(null);
    this.currentTimeSeconds.set(0);
    this.resetInteractiveRuntime();
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

  private nextSourceLoadToken(): number {
    return untracked(() => {
      const nextToken = this.sourceLoadToken() + 1;
      this.sourceLoadToken.set(nextToken);
      return nextToken;
    });
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
      const session = await this.resolveAdaptivePlaybackSession();
      if (session) {
        return { kind: 'adaptive', url: session.playUrl };
      }
    }

    if (this.streamVideoUid()) {
      const session = await this.resolveAdaptivePlaybackSession('hls');
      if (session) {
        return { kind: 'adaptive', url: session.playUrl };
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

    if (await this.tryRefreshAdaptivePlaybackUrl(video)) {
      return;
    }

    this.showVideoPlaybackError();
  }

  private showVideoPlaybackError(recordError = true): void {
    if (recordError) {
      this.qoe.recordError();
    }
    const hasOfflineSource = !!this.normalizeOfflineVideoUrl(this.offlineVideoUrl());
    this.error.set(
      hasOfflineSource
        ? 'Video ngoại tuyến này chưa phát được trên trình duyệt hiện tại. Hãy thử cập nhật gói hoặc phát trực tuyến.'
        : 'Không thể phát video này. Vui lòng thử lại.'
    );
    this.isLoading.set(false);
  }

  private async handleShakaPlayerError(video: HTMLVideoElement, error: unknown): Promise<void> {
    this.qoe.recordError();
    if (await this.tryRefreshAdaptivePlaybackUrl(video, error)) {
      return;
    }

    if (this.shouldShowPlaybackErrorAfterRefreshExhausted(error)) {
      this.warnAdaptivePlaybackRecovery('playback-url-refresh-exhausted', error);
      this.showVideoPlaybackError(false);
    }
  }

  private shouldShowPlaybackErrorAfterRefreshExhausted(error: unknown): boolean {
    return !!this.activeAdaptiveManifestUrl
      && this.attemptedPlaybackUrlRefresh
      && !this.normalizeOfflineVideoUrl(this.offlineVideoUrl())
      && isRecoverableAdaptiveStreamError(error);
  }

  private canRefreshAdaptivePlaybackUrl(error?: unknown): boolean {
    return shouldRefreshAdaptivePlaybackUrl({
      activeAdaptiveManifestUrl: this.activeAdaptiveManifestUrl,
      attemptedRefresh: this.attemptedPlaybackUrlRefresh,
      hasOfflineSource: !!this.normalizeOfflineVideoUrl(this.offlineVideoUrl()),
      error,
    });
  }

  private async tryRefreshAdaptivePlaybackUrl(
    video: HTMLVideoElement | null,
    error?: unknown,
  ): Promise<boolean> {
    if (!video || !this.canRefreshAdaptivePlaybackUrl(error)) {
      return false;
    }

    const manifestUrl = this.activeAdaptiveManifestUrl;
    if (!manifestUrl) {
      return false;
    }

    this.attemptedPlaybackUrlRefresh = true;
    this.warnAdaptivePlaybackRecovery('refreshing-playback-url', error);
    const refreshToken = this.sourceLoadToken();
    const format: VideoPlaybackManifestFormat = resolvePlaybackManifestFormat(manifestUrl);
    const resumeAtSeconds = Number.isFinite(video.currentTime) && video.currentTime > 0
      ? video.currentTime
      : 0;

    try {
      const refreshedUrl = await this.resolveAdaptivePlayUrl(format);
      if (refreshToken !== this.sourceLoadToken()) {
        return true;
      }
      if (!refreshedUrl) {
        return false;
      }

      this.error.set(null);
      this.isLoading.set(true);
      await this.destroyShakaPlayer();
      if (refreshToken !== this.sourceLoadToken()) {
        return true;
      }

      await this.initializeShaka(video, refreshedUrl, resumeAtSeconds);
      return true;
    } catch {
      return false;
    }
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
      const cache = await caches.open(`offline-videos:${getCurrentUserId()}`);
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

  private async resolveAdaptivePlaybackSession(format: 'hls' | 'dash' = 'hls'): Promise<AdaptivePlaybackSession | null> {
    const sectionId = this.sectionId();
    if (sectionId) {
      try {
        const response: any = await firstValueFrom(this.sectionApi.getVideoPlayUrl(sectionId, format));
        const session = this.readAdaptivePlaybackSession(response, format);
        if (session) {
          this.rememberAdaptivePlaybackSession(session, 'section');
          return session;
        }
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
      const session = this.readAdaptivePlaybackSession(response, format);
      if (session) {
        this.rememberAdaptivePlaybackSession(session, 'lesson');
      }
      return session;
    } catch {
      return null;
    }
  }

  private async resolveAdaptivePlayUrl(format: 'hls' | 'dash' = 'hls'): Promise<string | null> {
    return (await this.resolveAdaptivePlaybackSession(format))?.playUrl ?? null;
  }

  private readAdaptivePlaybackSession(
    response: any,
    requestedFormat: 'hls' | 'dash',
  ): AdaptivePlaybackSession | null {
    const data = response?.data ?? response;
    if (!data || typeof data.playUrl !== 'string' || !data.playUrl.trim()) {
      return null;
    }

    return {
      playUrl: data.playUrl,
      videoAssetId: this.readPlaybackString(data.videoAssetId),
      videoSourceKind: this.readPlaybackString(data.videoSourceKind),
      format: this.readPlaybackString(data.format) ?? requestedFormat,
      cdnDeliveryMode: this.readPlaybackString(data.cdnDeliveryMode),
      mediaDomainSegmentDeliveryEnabled: typeof data.mediaDomainSegmentDeliveryEnabled === 'boolean'
        ? data.mediaDomainSegmentDeliveryEnabled
        : null,
    };
  }

  private rememberAdaptivePlaybackSession(session: AdaptivePlaybackSession, source: 'section' | 'lesson'): void {
    this.activeCdnDeliveryMode = session.cdnDeliveryMode ?? null;
    this.activeMediaDomainSegmentDeliveryEnabled = session.mediaDomainSegmentDeliveryEnabled ?? null;
    this.logAdaptivePlaybackDiagnostic('session-resolved', {
      source,
      format: session.format,
      videoAssetId: session.videoAssetId,
      videoSourceKind: session.videoSourceKind,
    });
  }

  private readPlaybackString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private logAdaptivePlaybackDiagnostic(event: string, details: Record<string, unknown> = {}): void {
    if (typeof console === 'undefined') {
      return;
    }

    console.debug('[AdaptiveVideoPlayer] CDN playback', {
      event,
      cdnDeliveryMode: this.activeCdnDeliveryMode,
      mediaDomainSegmentDeliveryEnabled: this.activeMediaDomainSegmentDeliveryEnabled,
      manifestUrl: this.redactAdaptiveManifestUrl(this.activeAdaptiveManifestUrl),
      ...details,
    });
  }

  private warnAdaptivePlaybackRecovery(reason: string, error?: unknown): void {
    if (typeof console === 'undefined') {
      return;
    }

    console.warn('[AdaptiveVideoPlayer] CDN playback recovery', {
      reason,
      status: extractAdaptivePlaybackHttpStatus(error),
      cdnDeliveryMode: this.activeCdnDeliveryMode,
      mediaDomainSegmentDeliveryEnabled: this.activeMediaDomainSegmentDeliveryEnabled,
      manifestUrl: this.redactAdaptiveManifestUrl(this.activeAdaptiveManifestUrl),
    });
  }

  private redactAdaptiveManifestUrl(manifestUrl: string | null): string | null {
    if (!manifestUrl) {
      return null;
    }

    return manifestUrl
      .replace(/\/adaptive\/[^/]+/i, '/adaptive/<redacted>')
      .replace(/([?&](?:token|verify)=)[^&]+/gi, '$1<redacted>');
  }

  private async initializeShaka(
    videoElement: HTMLVideoElement,
    manifestUrl: string,
    startTimeSeconds = 0,
  ): Promise<void> {
    this.activeAdaptiveManifestUrl = manifestUrl;

    if (canUseNativeHlsForManifest(manifestUrl, videoElement)) {
      this.loadNativeHls(videoElement, manifestUrl, startTimeSeconds);
      return;
    }

    const shakaNamespace = await import('shaka-player/dist/shaka-player.compiled');
    const shaka = (shakaNamespace as any).default ?? shakaNamespace;
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      this.loadNativeHls(videoElement, manifestUrl, startTimeSeconds);
      return;
    }

    const preferNativeHls = shouldPreferNativeHlsForManifest(manifestUrl);
    const player = new shaka.Player();
    await player.attach(videoElement);
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
        lowLatencyMode: false,
        preferNativeHls,
        segmentPrefetchLimit: preferNativeHls ? 1 : 2,
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

    player.addEventListener('error', (event: any) => {
      if (this.shakaPlayer !== player) {
        this.qoe.recordError();
        return;
      }
      void this.handleShakaPlayerError(videoElement, event?.detail ?? event);
    });

    try {
      await player.load(manifestUrl, startTimeSeconds > 0 ? startTimeSeconds : undefined);
      this.activeAdaptiveManifestUrl = manifestUrl;
    } catch {
      // HLS failed — try DASH fallback
      const dashUrl = await this.resolveAdaptivePlayUrl('dash');
      if (dashUrl && dashUrl !== manifestUrl) {
        try {
          await player.load(dashUrl, startTimeSeconds > 0 ? startTimeSeconds : undefined);
          this.activeAdaptiveManifestUrl = dashUrl;
        } catch {
          this.error.set('Không thể phát video thích ứng. Vui lòng thử lại.');
          this.isLoading.set(false);
          return;
        }
      } else {
        this.error.set('Không thể phát video thích ứng. Vui lòng thử lại.');
        this.isLoading.set(false);
        return;
      }
    }
    this.shakaPlayer = player;
    this.syncActiveVariant(player);
    this.isLoading.set(false);
  }

  private loadNativeHls(
    videoElement: HTMLVideoElement,
    manifestUrl: string,
    startTimeSeconds = 0,
  ): void {
    this.shakaPlayer = null;
    this.activeAdaptiveManifestUrl = manifestUrl;
    this.availableQualities.set([]);
    this.isAutoQuality.set(true);
    this.qualityLabel.set(null);
    if (startTimeSeconds > 0) {
      videoElement.addEventListener('loadedmetadata', () => {
        try {
          videoElement.currentTime = startTimeSeconds;
          this.currentTimeSeconds.set(startTimeSeconds);
        } catch {
          // Browser may reject seeks before its native HLS timeline is ready.
        }
      }, { once: true });
    }
    videoElement.src = manifestUrl;
    videoElement.load();
    this.isLoading.set(false);
  }

  private syncActiveVariant(player: any): void {
    try {
      const tracks = player.getVariantTracks();
      const activeVariant = tracks.find((track: any) => track.active);
      if (!activeVariant) return;

      if (activeVariant.height) {
        this.qualityLabel.set(`${activeVariant.height}p`);
      }
      if (activeVariant.bandwidth) {
        this.qoe.recordBitrateChange(Math.round(activeVariant.bandwidth / 1_000));
      }

      // Update available qualities (deduplicated by height)
      const seen = new Set<number>();
      const qualities = tracks
        .filter((t: any) => t.height && !seen.has(t.height) && seen.add(t.height))
        .map((t: any) => ({ height: t.height as number, bandwidth: t.bandwidth as number }))
        .sort((a: any, b: any) => b.height - a.height);
      if (qualities.length > 1) {
        this.availableQualities.set(qualities);
      }
    } catch {
      // Best-effort QoE sync only.
    }
  }

  /** Manual quality selection (YouTube/Coursera pattern) */
  selectQuality(quality: { height: number; bandwidth: number } | null): void {
    this.showQualityMenu.set(false);
    if (!this.shakaPlayer) return;

    try {
      if (quality === null) {
        // Auto mode: re-enable ABR
        this.shakaPlayer.configure('abr.enabled', true);
        this.isAutoQuality.set(true);
      } else {
        // Manual: disable ABR, select specific variant
        this.shakaPlayer.configure('abr.enabled', false);
        const tracks = this.shakaPlayer.getVariantTracks();
        const target = tracks.find((t: any) => t.height === quality.height);
        if (target) {
          this.shakaPlayer.selectVariantTrack(target, /* clearBuffer */ true);
          this.qualityLabel.set(`${quality.height}p`);
        }
        this.isAutoQuality.set(false);
      }
    } catch {
      // Fallback: re-enable ABR
      this.shakaPlayer?.configure?.('abr.enabled', true);
      this.isAutoQuality.set(true);
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
        this.currentTimeSeconds.set(resumePosition);
        this.markInteractiveVideoWatched(resumePosition);
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

  onInteractiveChoice(choice: InteractiveVideoChoice): void {
    const interaction = this.activeInteraction();
    if (!interaction) {
      return;
    }

    this.selectedChoiceId.set(choice.id);
    const action = interaction.type === 'branch' ? 'branch_taken' : 'answered';
    void this.recordInteractiveEvent(interaction, action, {
      choiceId: choice.id,
      isCorrect: choice.isCorrect === true,
      targetTimeSeconds: choice.targetTimeSeconds ?? null,
      targetInteractionId: choice.targetInteractionId ?? null,
    });

    if (interaction.type === 'branch' && !isInteractiveVideoReviewInteraction(interaction)) {
      this.jumpToInteractiveChoiceTarget(choice);
    }
  }

  onInteractiveReviewRequested(): void {
    const interaction = this.activeInteraction();
    const choice = interaction?.choices?.find(item => item.id === this.selectedChoiceId()) ?? null;
    const video = this.videoElement()?.nativeElement;
    if (!interaction || !choice || !video) {
      return;
    }

    const target = resolveInteractiveVideoReviewTarget(
      interaction,
      choice,
      this.interactiveVideoSpec()?.timeline ?? [],
    );
    if (target == null) {
      return;
    }

    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);
    this.seekVideoProgrammatically(video, target);
    this.currentTimeSeconds.set(target);
    void video.play().catch(() => {});
  }

  onInteractiveContinue(): void {
    const interaction = this.activeInteraction();
    if (!interaction) {
      return;
    }

    this.markInteractiveInteractionCompleted(interaction.id);
    void this.recordInteractiveEvent(interaction, 'continued', {
      choiceId: this.selectedChoiceId(),
    });
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);

    const video = this.videoElement()?.nativeElement;
    if (video?.paused) {
      void video.play().catch(() => {});
    }
  }

  openInteractiveInteraction(interaction: InteractiveVideoInteraction): void {
    if (this.completedInteractionIds.has(interaction.id)) {
      return;
    }
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      return;
    }
    this.activateInteractiveInteraction(interaction, video);
  }

  private evaluateInteractiveTimeline(
    video: HTMLVideoElement,
    previousTimeSeconds = this.currentTimeSeconds(),
  ): void {
    if (this.activeInteraction()) {
      return;
    }

    const spec = this.interactiveVideoSpec();
    if (!spec || spec.enabled === false || !Array.isArray(spec.timeline) || spec.timeline.length === 0) {
      return;
    }

    const dueInteraction = getDueInteractiveVideoInteraction({
      timeline: spec.timeline,
      currentTimeSeconds: video.currentTime,
      previousTimeSeconds,
      completedInteractionIds: this.completedInteractionIds,
    });

    if (!dueInteraction) {
      return;
    }

    this.activateInteractiveInteraction(dueInteraction, video);
  }

  private activateInteractiveInteraction(
    interaction: InteractiveVideoInteraction,
    video: HTMLVideoElement,
  ): void {
    this.activeInteraction.set(interaction);
    this.selectedChoiceId.set(null);
    if (interaction.pause !== false) {
      video.pause();
    }

    if (!this.shownInteractionIds.has(interaction.id)) {
      this.shownInteractionIds.add(interaction.id);
      void this.recordInteractiveEvent(interaction, 'shown');
    }
  }

  private jumpToInteractiveChoiceTarget(choice: InteractiveVideoChoice): void {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      return;
    }

    const active = this.activeInteraction();
    if (active) {
      this.markInteractiveInteractionCompleted(active.id);
    }
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);

    const isBranch = active?.type === 'branch';
    const targetTime = resolveInteractiveVideoChoiceTarget(
      choice,
      this.interactiveVideoSpec()?.timeline ?? [],
      {
        sourceTimeSeconds: isBranch ? active.atSeconds : null,
        allowBackwardSeek: isBranch,
      },
    );
    if (typeof targetTime === 'number' && Number.isFinite(targetTime)) {
      const target = Math.max(0, targetTime);
      this.seekVideoProgrammatically(video, target);
      this.currentTimeSeconds.set(target);
    }
    void video.play().catch(() => {});
  }

  private resetInteractiveRuntime(): void {
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);
    this.shownInteractionIds.clear();
    this.completedInteractionIds.clear();
    this.completedInteractionIdsSnapshot.set(new Set<string>());
    this.watchedRanges = [];
    this.furthestWatchedSeconds = 0;
    this.isSeeking = false;
    this.seekStartTimeSeconds = 0;
    this.skipNextWatchedMark = false;
  }

  private reopenInteractiveMarkerAtTarget(targetTimeSeconds: number): void {
    const targetInteraction = this.interactiveVideoSpec()?.timeline
      ?.find(interaction => Math.abs(interaction.atSeconds - targetTimeSeconds) <= 1);
    if (!targetInteraction) {
      return;
    }

    this.completedInteractionIds.delete(targetInteraction.id);
    this.shownInteractionIds.delete(targetInteraction.id);
    this.completedInteractionIdsSnapshot.set(new Set(this.completedInteractionIds));
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);
  }

  private seekVideoProgrammatically(video: HTMLVideoElement, targetTimeSeconds: number): void {
    if (!this.isSeeking) {
      this.seekStartTimeSeconds = this.currentTimeSeconds();
    }
    this.isSeeking = true;
    this.skipNextWatchedMark = true;
    video.currentTime = targetTimeSeconds;
  }

  private markInteractiveInteractionCompleted(interactionId: string): void {
    this.completedInteractionIds.add(interactionId);
    this.completedInteractionIdsSnapshot.set(new Set(this.completedInteractionIds));
  }

  private snapBlockedInteractiveSeek(video: HTMLVideoElement): boolean {
    const target = this.resolveAllowedInteractiveSeekTarget(video.currentTime);
    if (target === video.currentTime) {
      return false;
    }

    video.currentTime = target;
    this.currentTimeSeconds.set(target);
    this.evaluateInteractiveTimeline(video);
    return true;
  }

  private resolveAllowedInteractiveSeekTarget(targetTimeSeconds: number): number {
    return shouldBlockInteractiveVideoSeek({
      spec: this.interactiveVideoSpec(),
      targetTimeSeconds,
      furthestWatchedSeconds: this.furthestWatchedSeconds,
      hasIncompleteRequiredInteractions: this.hasIncompleteRequiredInteractions(),
      watchedRanges: this.watchedRanges,
    })
      ? this.resolveBlockedInteractiveSeekTarget(targetTimeSeconds)
      : targetTimeSeconds;
  }

  private resolveBlockedInteractiveSeekTarget(targetTimeSeconds: number): number {
    const mode = this.interactiveVideoSpec()?.behavior?.preventSkippingMode ?? 'none';
    if (mode === 'both' && targetTimeSeconds <= this.furthestWatchedSeconds) {
      return this.currentTimeSeconds();
    }

    return this.furthestWatchedSeconds;
  }

  private hasIncompleteRequiredInteractions(): boolean {
    const spec = this.interactiveVideoSpec();
    if (!spec || spec.enabled === false) {
      return false;
    }

    return spec.timeline.some(interaction =>
      isInteractiveVideoProgressGateInteraction(interaction)
        && !this.completedInteractionIds.has(interaction.id),
    );
  }

  private markInteractiveVideoWatched(seconds: number, previousSeconds = seconds): void {
    if (Number.isFinite(seconds)) {
      const current = Math.max(0, seconds);
      const previous = Number.isFinite(previousSeconds) ? Math.max(0, previousSeconds) : current;
      this.furthestWatchedSeconds = Math.max(this.furthestWatchedSeconds, current);
      this.watchedRanges = addInteractiveVideoWatchedRange(this.watchedRanges, previous, current);
    }
  }

  private async recordInteractiveEvent(
    interaction: InteractiveVideoInteraction,
    action: InteractiveVideoRuntimeEvent['action'],
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const videoTimeSeconds = this.videoElement()?.nativeElement?.currentTime ?? interaction.atSeconds;
    const occurredAt = new Date();
    const sectionId = this.getTrackingSectionId();
    const runtimeEvent: InteractiveVideoRuntimeEvent = {
      interactionId: interaction.id,
      action,
      videoTimeSeconds,
      data: {
        interactionType: interaction.type,
        ...data,
      },
    };
    const analyticsProjection = buildInteractiveVideoAnalyticsProjection({
      lessonId: this.lessonId(),
      sectionId,
      interaction,
      event: runtimeEvent,
      occurredAtIso: occurredAt.toISOString(),
    });
    const payload = {
      lessonId: this.lessonId(),
      sectionId,
      interactionId: interaction.id,
      action,
      videoTimeSeconds,
      data: {
        ...runtimeEvent.data,
        analyticsProjection,
      },
      occurredAt: occurredAt.toISOString(),
      entityId: interaction.id,
    };

    this.interactiveEvent.emit({ ...runtimeEvent, data: payload.data });

    if (this.isBrowserOnline()) {
      try {
        await firstValueFrom(this.learningActivityApi.recordInteractiveVideoEvent(payload));
        return;
      } catch {
        // Queue below so reconnect can replay the event.
      }
    }

    await this.queueInteractiveEventOffline(payload, interaction.id, occurredAt);
  }

  private isBrowserOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  private canUseOfflineQueue(): boolean {
    return typeof window !== 'undefined'
      && typeof localStorage !== 'undefined'
      && typeof localStorage.getItem === 'function'
      && typeof indexedDB !== 'undefined';
  }

  private async queueInteractiveEventOffline(
    payload: unknown,
    interactionId: string,
    occurredAt: Date,
  ): Promise<void> {
    if (!this.canUseOfflineQueue()) {
      return;
    }

    try {
      const offlineSync = this.injector.get(OfflineSyncService);
      await offlineSync.queueOperation(
        'learningEvent',
        'CREATE',
        '/api/v3/learning-activity/interactive-video/events',
        payload,
        {
          entityId: interactionId,
          occurredAt,
        },
      );
    } catch {
      // Interactive tracking must never interrupt playback.
    }
  }

  private accumulatePlayTime(): void {
    if (this.playbackStartedAtMs == null) {
      return;
    }

    this.totalPlayTimeMs += performance.now() - this.playbackStartedAtMs;
    this.playbackStartedAtMs = null;
  }
}
