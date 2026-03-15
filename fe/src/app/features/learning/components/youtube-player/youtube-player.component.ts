import {
  Component,
  input,
  output,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  NgZone
} from '@angular/core';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';

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
  template: `<div class="youtube-player-wrapper"><div [id]="playerId"></div></div>`,
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
  videoEnded = output<void>();

  private tracker = inject(WatchedSegmentsTracker);
  private videoProgressApi = inject(VideoProgressApi);
  private heartbeat = inject(HeartbeatTracker);
  private zone = inject(NgZone);
  private player: any = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

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
      this.tracker.startTracking(this.lessonId(), this.sectionId(), duration);
    }

    // Resume from last position
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
      this.heartbeat.start(this.lessonId(), this.sectionId(), 'VIDEO');
      this.startPolling();
    } else {
      this.heartbeat.stop();
      this.stopPolling();
    }

    if (event.data === YT.PlayerState.ENDED) {
      this.tracker.stopTracking();
      this.heartbeat.stop();
      this.zone.run(() => this.videoEnded.emit());
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.player?.getCurrentTime) {
        const currentTime = this.player.getCurrentTime();
        this.tracker.recordSecond(currentTime);
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.tracker.stopTracking();
    this.heartbeat.stop();
    if (this.player?.destroy) {
      this.player.destroy();
      this.player = null;
    }
  }
}
