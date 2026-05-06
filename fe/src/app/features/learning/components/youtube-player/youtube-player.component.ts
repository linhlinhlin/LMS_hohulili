import {
  Component,
  input,
  output,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  NgZone
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { LearningActivityApi } from '../../../../api/client/learning-activity.api';
import { InteractiveVideoOverlayComponent } from '../../../../shared/blocks/video-block/interactive-video-overlay.component';
import { buildInteractiveVideoAnalyticsProjection } from '../../../../core/utils/interactive-video-analytics';
import type {
  InteractiveVideoChoice,
  InteractiveVideoInteraction,
  InteractiveVideoRuntimeEvent,
  InteractiveVideoSpec,
} from '../../../../api/types/interactive-video.types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiReady = false;
const apiReadyCallbacks: (() => void)[] = [];

function loadYouTubeApi(): Promise<void> {
  if (apiReady) return Promise.resolve();
  return new Promise<void>((resolve) => {
    if (apiLoaded) {
      apiReadyCallbacks.push(resolve);
      return;
    }
    apiLoaded = true;
    apiReadyCallbacks.push(resolve);

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (prevCallback) prevCallback();
      for (const cb of apiReadyCallbacks) cb();
      apiReadyCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

@Component({
  selector: 'app-youtube-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [InteractiveVideoOverlayComponent],
  template: `
    <div class="youtube-player-wrapper">
      <div [id]="playerId"></div>
      @if (activeInteraction(); as interaction) {
        <app-interactive-video-overlay
          [interaction]="interaction"
          [selectedChoiceId]="selectedChoiceId()"
          (choiceSelected)="onInteractiveChoice($event)"
          (continueRequested)="onInteractiveContinue()" />
      }
    </div>
  `,
  styles: [`
    app-youtube-player {
      display: block;
      width: 100%;
    }
    app-youtube-player .youtube-player-wrapper {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      background: #000;
    }
    app-youtube-player .youtube-player-wrapper iframe {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }
  `]
})
export class YouTubePlayerComponent implements OnInit, OnDestroy {
  videoUrl = input.required<string>();
  lessonId = input.required<string>();
  sectionId = input.required<string>();
  completionThreshold = input<number | undefined>(undefined);
  trackingEnabled = input(true);
  interactiveVideoSpec = input<InteractiveVideoSpec | null>(null);
  videoEnded = output<void>();
  durationLoaded = output<number>();
  interactiveEvent = output<InteractiveVideoRuntimeEvent>();

  private tracker = inject(WatchedSegmentsTracker);
  private videoProgressApi = inject(VideoProgressApi);
  private heartbeat = inject(HeartbeatTracker);
  private learningActivityApi = inject(LearningActivityApi);
  private zone = inject(NgZone);
  private player: any = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  readonly activeInteraction = signal<InteractiveVideoInteraction | null>(null);
  readonly selectedChoiceId = signal<string | null>(null);
  private readonly shownInteractionIds = new Set<string>();
  private readonly completedInteractionIds = new Set<string>();

  readonly playerId = 'yt-player-' + Math.random().toString(36).substring(2, 9);

  ngOnInit(): void {
    const videoId = extractVideoId(this.videoUrl());
    if (!videoId) return;

    loadYouTubeApi().then(() => {
      this.zone.runOutsideAngular(() => {
        this.player = new window.YT.Player(this.playerId, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1
          },
          events: {
            onReady: (event: any) => this.onPlayerReady(event),
            onStateChange: (event: any) => this.onStateChange(event)
          }
        });
      });
    });
  }

  private onPlayerReady(event: any): void {
    // Force iframe to fill wrapper (YouTube sets width="640" height="360" by default)
    const iframe = event.target?.getIframe?.();
    if (iframe) {
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.removeAttribute('width');
      iframe.removeAttribute('height');
    }

    const duration = event.target.getDuration?.() || 0;
    if (duration > 0) {
      this.zone.run(() => this.durationLoaded.emit(duration));
    }
    if (duration > 0) {
      if (this.trackingEnabled()) {
        this.tracker.startTracking(this.lessonId(), this.sectionId(), duration, this.completionThreshold());
      }
    }

    // Resume from last position
    if (!this.trackingEnabled()) {
      return;
    }
    this.videoProgressApi.getResumePosition(this.sectionId()).subscribe({
      next: (res: any) => {
        if (res?.success && res.data?.position > 0 && this.player?.seekTo) {
          this.player.seekTo(res.data.position, true);
        }
      },
      error: () => {}
    });
  }

  private onStateChange(event: any): void {
    const YT = window.YT;
    if (!YT) return;

    if (event.data === YT.PlayerState.PLAYING) {
      if (this.trackingEnabled()) {
        this.heartbeat.start(this.lessonId(), this.sectionId(), 'VIDEO');
      }
      this.startPolling();
    } else {
      if (this.trackingEnabled()) {
        this.heartbeat.stop();
      }
      this.stopPolling();
    }

    if (event.data === YT.PlayerState.ENDED) {
      if (this.trackingEnabled()) {
        this.tracker.stopTracking();
        this.heartbeat.stop();
      }
      this.zone.run(() => this.videoEnded.emit());
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.player?.getCurrentTime) {
        const currentTime = this.player.getCurrentTime();
        if (this.trackingEnabled()) {
          this.tracker.recordSecond(currentTime);
        }
        this.zone.run(() => this.evaluateInteractiveTimeline(currentTime));
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
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

    if (interaction.type === 'branch') {
      this.jumpToInteractiveChoiceTarget(choice);
    }
  }

  onInteractiveContinue(): void {
    const interaction = this.activeInteraction();
    if (!interaction) {
      return;
    }

    this.completedInteractionIds.add(interaction.id);
    void this.recordInteractiveEvent(interaction, 'continued', {
      choiceId: this.selectedChoiceId(),
    });
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);
    this.player?.playVideo?.();
  }

  private evaluateInteractiveTimeline(currentTime: number): void {
    if (this.activeInteraction()) {
      return;
    }

    const spec = this.interactiveVideoSpec();
    if (!spec || spec.enabled === false || !Array.isArray(spec.timeline) || spec.timeline.length === 0) {
      return;
    }

    const dueInteraction = spec.timeline.find(interaction => {
      if (this.completedInteractionIds.has(interaction.id)) {
        return false;
      }
      if (currentTime < interaction.atSeconds) {
        return false;
      }

      const endSeconds = interaction.endSeconds ?? interaction.atSeconds + 5;
      return interaction.required === true || currentTime <= endSeconds;
    });

    if (!dueInteraction) {
      return;
    }

    this.activeInteraction.set(dueInteraction);
    this.selectedChoiceId.set(null);
    if (dueInteraction.pause !== false) {
      this.player?.pauseVideo?.();
    }

    if (!this.shownInteractionIds.has(dueInteraction.id)) {
      this.shownInteractionIds.add(dueInteraction.id);
      void this.recordInteractiveEvent(dueInteraction, 'shown');
    }
  }

  private jumpToInteractiveChoiceTarget(choice: InteractiveVideoChoice): void {
    const active = this.activeInteraction();
    if (active) {
      this.completedInteractionIds.add(active.id);
    }
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);

    const targetTime = choice.targetTimeSeconds ?? this.resolveTargetInteractionTime(choice.targetInteractionId);
    if (typeof targetTime === 'number' && Number.isFinite(targetTime)) {
      this.player?.seekTo?.(Math.max(0, targetTime), true);
    }
    this.player?.playVideo?.();
  }

  private resolveTargetInteractionTime(targetInteractionId: string | null | undefined): number | null {
    if (!targetInteractionId) {
      return null;
    }

    return this.interactiveVideoSpec()?.timeline
      ?.find(interaction => interaction.id === targetInteractionId)
      ?.atSeconds ?? null;
  }

  private async recordInteractiveEvent(
    interaction: InteractiveVideoInteraction,
    action: InteractiveVideoRuntimeEvent['action'],
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const videoTimeSeconds = this.player?.getCurrentTime?.() ?? interaction.atSeconds;
    const occurredAt = new Date();
    const runtimeEvent: InteractiveVideoRuntimeEvent = {
      interactionId: interaction.id,
      action,
      videoTimeSeconds,
      data: {
        interactionType: interaction.type,
        sourceKind: 'youtube',
        ...data,
      },
    };

    this.interactiveEvent.emit(runtimeEvent);
    if (!this.trackingEnabled()) {
      return;
    }

    const analyticsProjection = buildInteractiveVideoAnalyticsProjection({
      lessonId: this.lessonId(),
      sectionId: this.sectionId(),
      interaction,
      event: runtimeEvent,
      occurredAtIso: occurredAt.toISOString(),
    });
    const payload = {
      lessonId: this.lessonId(),
      sectionId: this.sectionId(),
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

    try {
      await firstValueFrom(this.learningActivityApi.recordInteractiveVideoEvent(payload));
    } catch {
      // YouTube cannot run offline; progress events continue through normal video tracking.
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.activeInteraction.set(null);
    this.selectedChoiceId.set(null);
    if (this.trackingEnabled()) {
      this.tracker.stopTracking();
      this.heartbeat.stop();
    }
    if (this.player?.destroy) {
      this.player.destroy();
      this.player = null;
    }
  }
}
