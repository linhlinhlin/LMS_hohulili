import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { YouTubePlayerComponent } from './youtube-player.component';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { LearningActivityApi } from '../../../../api/client/learning-activity.api';

describe('YouTubePlayerComponent', () => {
  let fixture: ComponentFixture<YouTubePlayerComponent>;
  let players: Array<{ player: any; config: any }>;

  beforeEach(async () => {
    players = [];
    (window as any).YT = {
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
      Player: function (_mount: HTMLElement, config: any) {
        const iframe = document.createElement('iframe');
        const player = {
          destroy: jasmine.createSpy('destroy'),
          getDuration: () => 0,
          getCurrentTime: () => 0,
          getIframe: () => iframe,
          pauseVideo: jasmine.createSpy('pauseVideo'),
          playVideo: jasmine.createSpy('playVideo'),
          seekTo: jasmine.createSpy('seekTo'),
        };
        players.push({ player, config });
        queueMicrotask(() => config.events.onReady({ target: player }));
        return player;
      },
    };

    await TestBed.configureTestingModule({
      imports: [YouTubePlayerComponent],
      providers: [
        {
          provide: WatchedSegmentsTracker,
          useValue: {
            startTracking: jasmine.createSpy('startTracking'),
            recordSecond: jasmine.createSpy('recordSecond'),
            stopTracking: jasmine.createSpy('stopTracking'),
          },
        },
        {
          provide: VideoProgressApi,
          useValue: {
            getResumePosition: jasmine.createSpy('getResumePosition').and.returnValue(of({ success: false })),
          },
        },
        {
          provide: HeartbeatTracker,
          useValue: {
            start: jasmine.createSpy('start'),
            stop: jasmine.createSpy('stop'),
          },
        },
        {
          provide: LearningActivityApi,
          useValue: {
            recordInteractiveVideoEvent: jasmine.createSpy('recordInteractiveVideoEvent').and.returnValue(of({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(YouTubePlayerComponent);
    fixture.componentRef.setInput('lessonId', 'lesson-1');
    fixture.componentRef.setInput('sectionId', 'section-1');
    fixture.componentRef.setInput('videoUrl', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('recreates the iframe player and clears runtime state when the video source changes', async () => {
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 1,
      enabled: true,
      timeline: [
        {
          id: 'checkpoint-1',
          type: 'checkpoint',
          atSeconds: 0,
          title: 'Checkpoint',
          pause: true,
        },
      ],
    });
    fixture.detectChanges();
    (window as any).onYouTubeIframeAPIReady?.();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(players.length).toBe(1);
    const firstPlayer = players[0].player;

    fixture.componentInstance.activeInteraction.set({
      id: 'checkpoint-1',
      type: 'checkpoint',
      atSeconds: 0,
      title: 'Checkpoint',
      pause: true,
    });
    fixture.componentInstance.selectedChoiceId.set('choice-1');

    fixture.componentRef.setInput('videoUrl', 'https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(firstPlayer.destroy).toHaveBeenCalled();
    expect(players.length).toBe(2);
    expect(fixture.componentInstance.activeInteraction()).toBeNull();
    expect(fixture.componentInstance.selectedChoiceId()).toBeNull();
  });

  it('blocks marker seeks beyond watched time when forward skip prevention is enabled', async () => {
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline: [
        {
          id: 'required-1',
          type: 'single_choice',
          atSeconds: 30,
          title: 'Required check',
          required: true,
          choices: [{ id: 'a', label: 'Answer' }],
        },
      ],
    });
    fixture.detectChanges();
    (window as any).onYouTubeIframeAPIReady?.();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    const player = players[0].player;

    fixture.componentInstance.seekToInteractiveSecond(90);

    expect(player.seekTo).toHaveBeenCalledWith(0, true);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(0);
  });

  it('blocks marker seeks past non-required correctness-gated work', async () => {
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline: [
        {
          id: 'branch-review',
          type: 'branch',
          atSeconds: 40,
          required: false,
          adaptivity: { requireCorrectBeforeContinue: true },
          choices: [
            { id: 'wrong', label: 'Wrong', isCorrect: false, targetTimeSeconds: 10 },
            { id: 'right', label: 'Right', isCorrect: true },
          ],
        },
      ],
    });
    fixture.detectChanges();
    (window as any).onYouTubeIframeAPIReady?.();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    const player = players[0].player;
    player.getDuration = () => 120;
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 20);

    fixture.componentInstance.seekToInteractiveSecond(90);

    expect(player.seekTo).toHaveBeenCalledWith(20, true);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(20);
  });

  it('does not treat marker jumps as watched playback progress', async () => {
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      timeline: [
        {
          id: 'marker-75',
          type: 'checkpoint',
          atSeconds: 75,
          displayType: 'button',
          title: 'Review marker',
        },
      ],
    });
    fixture.detectChanges();
    (window as any).onYouTubeIframeAPIReady?.();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    const player = players[0].player;
    player.getDuration = () => 120;
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 20);

    fixture.componentInstance.seekToInteractiveSecond(75);

    expect(player.seekTo).toHaveBeenCalledWith(75, true);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(75);
    expect(fixture.componentInstance.activeInteraction()?.id).toBe('marker-75');
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(20);
  });

  it('allows branch choices to review earlier video without advancing watched progress', async () => {
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      timeline: [],
    });
    fixture.detectChanges();
    (window as any).onYouTubeIframeAPIReady?.();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    const player = players[0].player;
    const branch = {
      id: 'branch-navigation',
      type: 'branch' as const,
      atSeconds: 50,
      choices: [{ id: 'review', label: 'Review', targetTimeSeconds: 10 }],
    };
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 50);
    fixture.componentInstance.activeInteraction.set(branch);

    fixture.componentInstance.onInteractiveChoice(branch.choices[0]);

    expect(player.seekTo).toHaveBeenCalledWith(10, true);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(10);
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(50);
  });

  function getPrivate<T>(component: YouTubePlayerComponent, property: string): T {
    return (component as unknown as Record<string, T>)[property];
  }

  function setPrivate<T>(component: YouTubePlayerComponent, property: string, value: T): void {
    (component as unknown as Record<string, T>)[property] = value;
  }
});
