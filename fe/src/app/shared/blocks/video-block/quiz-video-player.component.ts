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
import { InteractiveVideoLayerComponent } from './interactive-video-layer.component';
import { InteractiveVideoOverlayComponent } from './interactive-video-overlay.component';
import { InteractiveVideoMarkersComponent } from './interactive-video-markers.component';
import {
  addInteractiveVideoWatchedRange,
  getDueInteractiveVideoInteraction,
  isInteractiveVideoProgressGateInteraction,
  isInteractiveVideoReviewInteraction,
  resolveInteractiveVideoChoiceTarget,
  resolveInteractiveVideoReviewTarget,
  shouldBlockInteractiveVideoSeek,
} from '../../../core/utils/interactive-video-runtime';
import type { InteractiveVideoWatchedRange } from '../../../core/utils/interactive-video-runtime';
import {
  canUseNativeHlsForManifest,
  shouldPreferNativeHlsForManifest,
} from '../../../core/utils/video-playback-platform';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../../api/types/interactive-video.types';

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
  host: { class: 'block w-full' },
  imports: [InteractiveVideoLayerComponent, InteractiveVideoOverlayComponent, InteractiveVideoMarkersComponent],
  template: `
    <div class="overflow-hidden rounded-lg bg-black">
      <div class="relative aspect-video w-full bg-black"
           (click)="showQualityMenu() && showQualityMenu.set(false)">
      <video
        #videoElement
        controls
        controlsList="nodownload"
        playsinline
        webkit-playsinline
        preload="metadata"
        crossorigin="anonymous"
        class="h-full w-full object-contain"
        [class.opacity-0]="isLoading() && !error() && !isProcessing()"
        (loadedmetadata)="onLoadedMetadata()"
        (durationchange)="onLoadedMetadata()"
        (timeupdate)="onTimeUpdate()"
        (seeking)="onSeeking()"
        (seeked)="onSeeked()"
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

      @if (isProcessing()) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-white">
          <div class="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-4 text-center shadow-xl">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white"></span>
            <p class="text-sm font-semibold">Đang xử lý video...</p>
            <p class="text-xs text-slate-400">Video sẽ sẵn sàng sau vài phút.</p>
            <button type="button" (click)="retry()"
              class="mt-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              Kiểm tra lại
            </button>
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

      <!-- Quality selector (same pattern as lesson player) -->
      <div class="absolute left-3 top-3 z-10">
        @if (showQualityMenu()) {
          <div class="rounded-lg bg-slate-950/90 backdrop-blur-sm py-1 min-w-[140px] shadow-lg">
            <button (click)="selectQuality(null)"
              class="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-white hover:bg-white/10"
              [class.font-bold]="isAutoQuality()">
              <span>Tự động</span>
              @if (isAutoQuality()) { <span class="text-sky-400">✓</span> }
            </button>
            @for (q of availableQualities(); track q.height) {
              <button (click)="selectQuality(q)"
                class="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-white hover:bg-white/10"
                [class.font-bold]="!isAutoQuality() && qualityLabel() === q.height + 'p'">
                <span>{{ q.height }}p</span>
                @if (!isAutoQuality() && qualityLabel() === q.height + 'p') { <span class="text-sky-400">✓</span> }
              </button>
            }
          </div>
        } @else if (qualityLabel()) {
          <button (click)="showQualityMenu.set(true)"
            class="rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-950/95 cursor-pointer flex items-center gap-1">
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

      @if (activeInteraction(); as interaction) {
        <app-interactive-video-overlay
          [interaction]="interaction"
          [selectedChoiceId]="selectedChoiceId()"
          [timeline]="interactiveVideoSpec()?.enabled === false ? [] : (interactiveVideoSpec()?.timeline ?? [])"
          [density]="overlayDensity()"
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
        (markerSelected)="seekToInteractiveSecond($event)" />
    </div>
  `
})
export class QuizVideoPlayerComponent {
  private readonly videoAssetApi = inject(VideoAssetApi);

  readonly videoAssetId = input<string | null>(null);
  readonly rawVideoUrl = input<string | null>(null);
  readonly interactiveVideoSpec = input<InteractiveVideoSpec | null>(null);
  readonly overlayDensity = input<'comfortable' | 'compact'>('comfortable');

  private readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);
  readonly error = signal<string | null>(null);
  readonly qualityLabel = signal<string | null>(null);
  readonly showQualityMenu = signal(false);
  readonly isAutoQuality = signal(true);
  readonly availableQualities = signal<Array<{ height: number; bandwidth: number }>>([]);
  readonly activeInteraction = signal<InteractiveVideoInteraction | null>(null);
  readonly selectedChoiceId = signal<string | null>(null);
  readonly videoDurationSeconds = signal<number | null>(null);
  readonly currentTimeSeconds = signal(0);
  readonly completedInteractionIdsSnapshot = signal<ReadonlySet<string>>(new Set<string>());

  private shakaPlayer: any = null;
  private loadToken = 0;
  private readonly shownInteractionIds = new Set<string>();
  private readonly completedInteractionIds = new Set<string>();
  private watchedRanges: InteractiveVideoWatchedRange[] = [];
  private furthestWatchedSeconds = 0;
  private isSeeking = false;
  /**
   * Time captured at the moment the user starts a seek (`seeking` event). Used
   * as `previousTimeSeconds` once the seek settles (`seeked`) so the runtime
   * can detect interactions the seek crossed (forward edge: prev < at <= cur).
   * Without this we passed `current` as previous, which always made the
   * forward-edge check false and let the user scrub past optional interactions.
   */
  private seekStartTimeSeconds = 0;

  constructor() {
    effect(() => {
      const videoRef = this.videoElement();
      const assetId = this.videoAssetId();
      const rawUrl = this.rawVideoUrl();

      if (!videoRef) return;

      // Trigger reload when inputs change
      void this.loadVideoSource(assetId, rawUrl);
    });

    effect(() => {
      this.interactiveVideoSpec();
      this.resetInteractiveRuntime();
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

  onLoadedMetadata(): void {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      return;
    }

    this.videoDurationSeconds.set(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    this.currentTimeSeconds.set(Number.isFinite(video.currentTime) ? video.currentTime : 0);
    this.markInteractiveVideoWatched(video.currentTime);
  }

  onTimeUpdate(): void {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      return;
    }
    if (this.isSeeking && this.snapBlockedInteractiveSeek(video)) {
      return;
    }
    const previousTimeSeconds = this.isSeeking ? video.currentTime : this.currentTimeSeconds();
    this.currentTimeSeconds.set(video.currentTime);
    // Only natural forward playback advances the watched mark; seek-driven
    // timeupdates would otherwise let a single forward jump bypass the
    // anti-skip gate. Backward playback is not possible without seeking.
    if (!this.isSeeking) {
      this.markInteractiveVideoWatched(video.currentTime, previousTimeSeconds);
    }
    this.evaluateInteractiveTimeline(video, previousTimeSeconds);
  }

  onSeeking(): void {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      return;
    }
    if (!this.isSeeking) {
      // Capture the playback time before the seek starts so we can drive the
      // forward-edge check against the actual user trajectory, not the post-seek
      // position. Subsequent seeking events within the same drag preserve the
      // original start anchor.
      this.seekStartTimeSeconds = this.currentTimeSeconds();
    }
    this.isSeeking = true;
    this.snapBlockedInteractiveSeek(video);
  }

  onSeeked(): void {
    const video = this.videoElement()?.nativeElement;
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
    const targetInteraction = this.interactiveVideoSpec()?.timeline
      ?.find(interaction => Math.abs(interaction.atSeconds - target) <= 1);
    if (targetInteraction) {
      this.completedInteractionIds.delete(targetInteraction.id);
      this.shownInteractionIds.delete(targetInteraction.id);
      this.completedInteractionIdsSnapshot.set(new Set(this.completedInteractionIds));
      this.activeInteraction.set(null);
      this.selectedChoiceId.set(null);
    }

    video.currentTime = target;
    this.currentTimeSeconds.set(video.currentTime);
    // Marker click is a seek, not playback. Skip markInteractiveVideoWatched
    // so the anti-skip gate isn't bypassed by jumping forward via the rail.
    this.evaluateInteractiveTimeline(video);
  }

  onInteractiveChoice(choice: InteractiveVideoChoice): void {
    const interaction = this.activeInteraction();
    if (!interaction) {
      return;
    }

    this.selectedChoiceId.set(choice.id);
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
    video.currentTime = target;
    this.currentTimeSeconds.set(target);
    // Review jump is a programmatic seek; don't advance the watched mark.
    void video.play().catch(() => {});
  }

  onInteractiveContinue(): void {
    const interaction = this.activeInteraction();
    if (!interaction) {
      return;
    }

    this.markInteractiveInteractionCompleted(interaction.id);
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

  private async loadVideoSource(assetId: string | null, rawUrl: string | null): Promise<void> {
    const videoEl = this.videoElement()?.nativeElement;
    if (!videoEl) return;

    const token = ++this.loadToken;
    await this.destroyShakaPlayer();
    this.resetInteractiveRuntime();
    this.error.set(null);
    this.isProcessing.set(false);
    this.isLoading.set(true);
    this.qualityLabel.set(null);
    this.videoDurationSeconds.set(null);
    this.currentTimeSeconds.set(0);

    try {
      const source = await this.resolveSource(assetId, rawUrl);
      if (token !== this.loadToken) return;

      if (!source) {
        // Asset ID known but no playable URL yet — still processing on the server
        if (assetId) {
          this.isProcessing.set(true);
        } else {
          this.error.set('Nguồn phát video chưa sẵn sàng.');
        }
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
        // Pre-validate asset status BEFORE attempting playback. Loading a dead
        // asset (DELETED/FAILED) hoặc not-ready (PENDING/PROCESSING) gây Shaka
        // retry loop → MediaSource reopen cycle → Chrome STATUS_BREAKPOINT crash.
        const assetRes: any = await firstValueFrom(this.videoAssetApi.getById(assetId));
        const asset = assetRes?.data ?? assetRes;
        if (asset?.status === 'READY') {
          const res: any = await firstValueFrom(this.videoAssetApi.getPlayUrl(assetId, 'hls'));
          const data = res?.data ?? res;
          if (data?.playUrl) {
            return { kind: 'adaptive', url: data.playUrl };
          }
        }
        // Asset exists but not READY → return null, caller sets isProcessing UI.
        // KHÔNG fall through to rawUrl vì rawUrl thường là playback URL của
        // chính asset đó (cũng dead).
        return null;
      } catch {
        // Network error trên getById/getPlayUrl — fall through to raw URL is OK
        // vì có thể section đã có rawUrl backup (e.g., legacy data).
      }
    }

    // Priority 2: Raw URL fallback (cho YouTube hoặc legacy non-asset videos)
    if (rawUrl) {
      const isManifest = rawUrl.includes('.m3u8') || rawUrl.includes('.mpd');
      return { kind: isManifest ? 'adaptive' : 'native', url: rawUrl };
    }

    return null;
  }

  private async initializeShaka(videoElement: HTMLVideoElement, manifestUrl: string): Promise<void> {
    if (canUseNativeHlsForManifest(manifestUrl, videoElement)) {
      this.loadNativeHls(videoElement, manifestUrl);
      return;
    }

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
        // Conservative retry: dead/stale assets từng gây Chrome STATUS_BREAKPOINT
        // crash khi Shaka retry 4× × MediaSource reopen cycle. 2 attempts đủ cho
        // transient network errors, không hammer BE on permanent 4xx.
        retryParameters: {
          baseDelay: 1_000,
          backoffFactor: 2,
          fuzzFactor: 0.5,
          maxAttempts: 2,
          timeout: 12_000,
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

    try {
      await player.load(manifestUrl);
    } catch (hlsError) {
      // Shaka HLS support occasionally trips on multivariant manifests with
      // I-frame playlists; DASH is the canonical fallback from the same
      // Shaka Packager output. Mirrors adaptive-video-player.component.ts.
      const assetId = this.videoAssetId();
      if (!assetId) throw hlsError;
      const dashRes: any = await firstValueFrom(this.videoAssetApi.getPlayUrl(assetId, 'dash'));
      const dashUrl = (dashRes?.data ?? dashRes)?.playUrl;
      if (!dashUrl || dashUrl === manifestUrl) throw hlsError;
      await player.load(dashUrl);
    }
    this.shakaPlayer = player;
    this.syncQuality(player);
    this.isLoading.set(false);
  }

  private loadNativeHls(videoElement: HTMLVideoElement, manifestUrl: string): void {
    this.shakaPlayer = null;
    this.availableQualities.set([]);
    this.isAutoQuality.set(true);
    this.qualityLabel.set(null);
    videoElement.src = manifestUrl;
    videoElement.load();
    this.isLoading.set(false);
  }

  private syncQuality(player: any): void {
    try {
      const tracks = player.getVariantTracks();
      const active = tracks.find((t: any) => t.active);
      if (active?.height) {
        this.qualityLabel.set(`${active.height}p`);
      }
      // Populate available qualities
      const seen = new Set<number>();
      const qualities = tracks
        .filter((t: any) => t.height && !seen.has(t.height) && seen.add(t.height))
        .map((t: any) => ({ height: t.height as number, bandwidth: t.bandwidth as number }))
        .sort((a: any, b: any) => b.height - a.height);
      if (qualities.length > 1) {
        this.availableQualities.set(qualities);
      }
    } catch {}
  }

  selectQuality(quality: { height: number; bandwidth: number } | null): void {
    this.showQualityMenu.set(false);
    if (!this.shakaPlayer) return;
    try {
      if (quality === null) {
        this.shakaPlayer.configure('abr.enabled', true);
        this.isAutoQuality.set(true);
      } else {
        this.shakaPlayer.configure('abr.enabled', false);
        const target = this.shakaPlayer.getVariantTracks().find((t: any) => t.height === quality.height);
        if (target) {
          this.shakaPlayer.selectVariantTrack(target, true);
          this.qualityLabel.set(`${quality.height}p`);
        }
        this.isAutoQuality.set(false);
      }
    } catch {
      this.shakaPlayer?.configure?.('abr.enabled', true);
      this.isAutoQuality.set(true);
    }
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
    if (this.shouldPauseForInteraction(interaction)) {
      video.pause();
    }

    this.shownInteractionIds.add(interaction.id);
  }

  /**
   * Resolve auto-pause from per-interaction `pause` first, then fall back to
   * the spec-level `behavior.pauseOnInteraction` switch. The previous logic
   * inspected only the per-interaction flag so `behavior.pauseOnInteraction =
   * false` was silently ignored.
   */
  private shouldPauseForInteraction(interaction: InteractiveVideoInteraction): boolean {
    if (interaction.pause === false) {
      return false;
    }
    return this.interactiveVideoSpec()?.behavior?.pauseOnInteraction !== false;
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

    // Branch choices commonly point backwards (e.g. "review the explanation").
    // Allow backward seeks for branch jumps; non-branch choices keep the
    // forward-only default to avoid accidental rewinds.
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
      video.currentTime = target;
      this.currentTimeSeconds.set(target);
      // Branch jump is a programmatic seek; let natural playback re-advance the
      // watched mark instead of pre-marking the unwatched region as seen.
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

  private async destroyShakaPlayer(): Promise<void> {
    if (this.shakaPlayer) {
      try { await this.shakaPlayer.destroy(); } catch {}
      this.shakaPlayer = null;
    }
  }
}
