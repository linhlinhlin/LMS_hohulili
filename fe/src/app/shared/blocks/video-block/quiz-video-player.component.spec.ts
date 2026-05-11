import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type {
  InteractiveVideoInteraction,
  InteractiveVideoSpec,
} from '../../../api/types/interactive-video.types';
import { VideoAssetApi } from '../../../api/client/video-asset.api';
import { QuizVideoPlayerComponent } from './quiz-video-player.component';

describe('QuizVideoPlayerComponent interactive video seek behavior', () => {
  let fixture: ComponentFixture<QuizVideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizVideoPlayerComponent],
      providers: [
        {
          provide: VideoAssetApi,
          useValue: {
            getById: () => of({ data: { status: 'READY' } }),
            getPlayUrl: () => of({ data: { playUrl: 'https://cdn.example/video.mpd' } }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizVideoPlayerComponent);
    fixture.detectChanges();
  });

  it('snaps a forward seek past incomplete required work without advancing watched progress', () => {
    const video = prepareVideoElement(20, 120);
    const spec: InteractiveVideoSpec = {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline: [
        {
          id: 'required-safety-check',
          type: 'single_choice',
          atSeconds: 40,
          required: true,
          choices: [{ id: 'ack', label: 'Acknowledge', isCorrect: true }],
        },
      ],
    };
    fixture.componentRef.setInput('interactiveVideoSpec', spec);
    fixture.componentInstance.currentTimeSeconds.set(20);
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 20);

    video.currentTime = 90;
    fixture.componentInstance.onSeeking();

    expect(video.currentTime).toBe(20);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(20);
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(20);
  });

  it('snaps a forward seek past correctness-gated work even when it is not marked required', () => {
    const video = prepareVideoElement(20, 120);
    const spec: InteractiveVideoSpec = {
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
            { id: 'wrong', label: 'Wrong', isCorrect: false, targetTimeSeconds: 15 },
            { id: 'right', label: 'Right', isCorrect: true },
          ],
        },
      ],
    };
    fixture.componentRef.setInput('interactiveVideoSpec', spec);
    fixture.componentInstance.currentTimeSeconds.set(20);
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 20);

    video.currentTime = 90;
    fixture.componentInstance.onSeeking();

    expect(video.currentTime).toBe(20);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(20);
  });

  it('opens an optional interaction crossed by a settled seek edge', () => {
    const video = prepareVideoElement(12, 120);
    const optional: InteractiveVideoInteraction = {
      id: 'optional-bridge-note',
      type: 'checkpoint',
      atSeconds: 30,
      displayType: 'button',
      title: 'Bridge note',
    };
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      timeline: [optional],
    });
    fixture.componentInstance.currentTimeSeconds.set(12);
    fixture.detectChanges();

    fixture.componentInstance.onSeeking();
    video.currentTime = 35;
    fixture.componentInstance.onSeeked();

    expect(fixture.componentInstance.activeInteraction()?.id).toBe('optional-bridge-note');
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(0);
  });

  it('does not treat marker jumps as watched playback progress', () => {
    const video = prepareVideoElement(20, 120);
    const marker: InteractiveVideoInteraction = {
      id: 'marker-75',
      type: 'checkpoint',
      atSeconds: 75,
      displayType: 'button',
      title: 'Review marker',
    };
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'forward' },
      timeline: [marker],
    });
    fixture.componentInstance.currentTimeSeconds.set(20);
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 20);

    fixture.componentInstance.seekToInteractiveSecond(75);

    expect(video.currentTime).toBe(75);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(75);
    expect(fixture.componentInstance.activeInteraction()?.id).toBe('marker-75');
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(20);
  });

  it('does not treat branch or review jumps as watched playback progress', () => {
    const video = prepareVideoElement(25, 120);
    const navigationBranch: InteractiveVideoInteraction = {
      id: 'branch-navigation',
      type: 'branch',
      atSeconds: 25,
      choices: [{ id: 'forward', label: 'Continue to drill', targetTimeSeconds: 80 }],
    };
    const reviewBranch: InteractiveVideoInteraction = {
      id: 'branch-review',
      type: 'branch',
      atSeconds: 35,
      adaptivity: { requireCorrectBeforeContinue: true },
      choices: [
        { id: 'wrong', label: 'Skip muster', isCorrect: false, targetTimeSeconds: 90 },
        { id: 'right', label: 'Complete muster', isCorrect: true },
      ],
    };
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      timeline: [navigationBranch, reviewBranch],
    });
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 25);

    fixture.componentInstance.activeInteraction.set(navigationBranch);
    fixture.componentInstance.onInteractiveChoice(navigationBranch.choices![0]);

    expect(video.currentTime).toBe(80);
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(25);

    fixture.componentInstance.activeInteraction.set(reviewBranch);
    fixture.componentInstance.selectedChoiceId.set('wrong');
    fixture.componentInstance.onInteractiveReviewRequested();

    expect(video.currentTime).toBe(90);
    expect(getPrivate<number>(fixture.componentInstance, 'furthestWatchedSeconds')).toBe(25);
  });

  it('blocks strict both-mode seeks into unwatched gaps', () => {
    const video = prepareVideoElement(90, 120);
    const required: InteractiveVideoInteraction = {
      id: 'required-quiz',
      type: 'single_choice',
      atSeconds: 100,
      required: true,
      choices: [{ id: 'ack', label: 'Acknowledge', isCorrect: true }],
    };
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'both' },
      timeline: [required],
    });
    fixture.componentInstance.currentTimeSeconds.set(90);
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 90);
    setPrivate(fixture.componentInstance, 'watchedRanges', [
      { startSeconds: 0, endSeconds: 30 },
      { startSeconds: 80, endSeconds: 90 },
    ]);

    video.currentTime = 60;
    fixture.componentInstance.onSeeking();

    expect(video.currentTime).toBe(90);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(90);
  });

  it('allows strict both-mode seeks inside watched ranges', () => {
    const video = prepareVideoElement(90, 120);
    const required: InteractiveVideoInteraction = {
      id: 'required-quiz',
      type: 'single_choice',
      atSeconds: 100,
      required: true,
      choices: [{ id: 'ack', label: 'Acknowledge', isCorrect: true }],
    };
    fixture.componentRef.setInput('interactiveVideoSpec', {
      version: 2,
      enabled: true,
      behavior: { preventSkippingMode: 'both' },
      timeline: [required],
    });
    fixture.componentInstance.currentTimeSeconds.set(90);
    fixture.detectChanges();
    setPrivate(fixture.componentInstance, 'furthestWatchedSeconds', 90);
    setPrivate(fixture.componentInstance, 'watchedRanges', [
      { startSeconds: 0, endSeconds: 30 },
      { startSeconds: 80, endSeconds: 90 },
    ]);

    video.currentTime = 85;
    fixture.componentInstance.onSeeking();

    expect(video.currentTime).toBe(85);
    expect(fixture.componentInstance.currentTimeSeconds()).toBe(90);
  });

  function prepareVideoElement(currentTime: number, duration: number): HTMLVideoElement {
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    let time = currentTime;
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => time,
      set: (value: number) => {
        time = value;
      },
    });
    Object.defineProperty(video, 'duration', {
      configurable: true,
      get: () => duration,
    });
    spyOn(video, 'pause').and.stub();
    spyOn(video, 'play').and.returnValue(Promise.resolve());
    return video;
  }

  function getPrivate<T>(component: QuizVideoPlayerComponent, property: string): T {
    return (component as unknown as Record<string, T>)[property];
  }

  function setPrivate<T>(component: QuizVideoPlayerComponent, property: string, value: T): void {
    (component as unknown as Record<string, T>)[property] = value;
  }
});
