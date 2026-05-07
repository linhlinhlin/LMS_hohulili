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
});
