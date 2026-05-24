import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SectionApi } from '../../../../api/client/section.api';
import { LearningActivityApi } from '../../../../api/client/learning-activity.api';
import { VideoProgressApi } from '../../../../api/client/video-progress.api';
import { NetworkStatusService } from '../../../../core/services/network-status.service';
import { QoETrackerService } from '../../../../core/services/qoe-tracker.service';
import { HeartbeatTracker } from '../../services/heartbeat-tracker.service';
import { WatchedSegmentsTracker } from '../../services/watched-segments-tracker.service';
import {
  AdaptiveVideoPlayerComponent,
  shouldShowMediaNetworkHint,
  type MediaNetworkHintState,
} from './adaptive-video-player.component';

describe('shouldShowMediaNetworkHint', () => {
  const baseState: MediaNetworkHintState = {
    online: true,
    saveDataEnabled: false,
    effectiveNetworkType: '4g',
    reportedDownlinkMbps: 12,
    appBandwidthMbps: 10,
    rebufferCount: 0,
    totalBufferTimeMs: 0,
  };

  function withState(overrides: Partial<MediaNetworkHintState>): MediaNetworkHintState {
    return { ...baseState, ...overrides };
  }

  it('does not show a weak-network hint from a browser 3g label alone', () => {
    expect(shouldShowMediaNetworkHint(withState({
      effectiveNetworkType: '3g',
      reportedDownlinkMbps: 8,
      appBandwidthMbps: 10,
    }))).toBeFalse();
  });

  it('shows the hint for explicit Save-Data mode', () => {
    expect(shouldShowMediaNetworkHint(withState({ saveDataEnabled: true }))).toBeTrue();
  });

  it('shows the hint for severe browser network classes', () => {
    expect(shouldShowMediaNetworkHint(withState({ effectiveNetworkType: '2g' }))).toBeTrue();
    expect(shouldShowMediaNetworkHint(withState({ effectiveNetworkType: 'slow-2g' }))).toBeTrue();
  });

  it('shows the hint when 3g has a low reported downlink', () => {
    expect(shouldShowMediaNetworkHint(withState({
      effectiveNetworkType: '3g',
      reportedDownlinkMbps: 0.8,
    }))).toBeTrue();
  });

  it('shows the hint after repeated noticeable buffering on a low app-bandwidth path', () => {
    expect(shouldShowMediaNetworkHint(withState({
      effectiveNetworkType: '4g',
      reportedDownlinkMbps: null,
      appBandwidthMbps: 0.9,
      rebufferCount: 2,
      totalBufferTimeMs: 2_000,
    }))).toBeTrue();
  });

  it('does not show the hint while offline because the offline banner owns that state', () => {
    expect(shouldShowMediaNetworkHint(withState({
      online: false,
      effectiveNetworkType: '2g',
      saveDataEnabled: true,
    }))).toBeFalse();
  });
});

describe('AdaptiveVideoPlayerComponent stream recovery', () => {
  let fixture: ComponentFixture<AdaptiveVideoPlayerComponent>;
  let component: AdaptiveVideoPlayerComponent;
  let qoe: jasmine.SpyObj<QoETrackerService>;

  beforeEach(async () => {
    qoe = jasmine.createSpyObj<QoETrackerService>('QoETrackerService', [
      'finishSession',
      'recordBitrateChange',
      'recordBufferEnd',
      'recordBufferStart',
      'recordError',
      'recordStartup',
      'startSession',
    ]);
    (qoe as any).metrics = signal(null);
    qoe.finishSession.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AdaptiveVideoPlayerComponent, HttpClientTestingModule],
      providers: [
        {
          provide: SectionApi,
          useValue: {
            getVideoPlayUrl: jasmine.createSpy('getVideoPlayUrl').and.returnValue(of(null)),
          },
        },
        {
          provide: VideoProgressApi,
          useValue: {
            getResumePosition: jasmine.createSpy('getResumePosition').and.returnValue(of(null)),
          },
        },
        {
          provide: LearningActivityApi,
          useValue: {
            recordInteractiveVideoEvent: jasmine
              .createSpy('recordInteractiveVideoEvent')
              .and.returnValue(of(null)),
          },
        },
        {
          provide: WatchedSegmentsTracker,
          useValue: {
            recordSecond: jasmine.createSpy('recordSecond'),
            startTracking: jasmine.createSpy('startTracking'),
            stopTracking: jasmine.createSpy('stopTracking'),
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
          provide: QoETrackerService,
          useValue: qoe,
        },
        {
          provide: NetworkStatusService,
          useValue: {
            online: () => true,
            saveDataEnabled: () => false,
            effectiveNetworkType: () => '4g',
            reportedDownlinkMbps: () => 12,
            effectiveBandwidthMbps: () => 10,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdaptiveVideoPlayerComponent);
    fixture.componentRef.setInput('lessonId', 'lesson-1');
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('shows a playback error when a Shaka CDN error happens after the refresh attempt is exhausted', async () => {
    const instance = component as any;
    const resolveAdaptivePlayUrl = spyOn(instance, 'resolveAdaptivePlayUrl')
      .and.returnValue(Promise.resolve('/fresh-master.m3u8'));
    instance.activeAdaptiveManifestUrl = '/api/v3/video-assets/a/adaptive/token/hls/master.m3u8';
    instance.attemptedPlaybackUrlRefresh = true;

    await instance.handleShakaPlayerError(document.createElement('video'), {
      data: ['/segment-1.m4s', 403, 'Forbidden'],
    });

    expect(resolveAdaptivePlayUrl).not.toHaveBeenCalled();
    expect(qoe.recordError).toHaveBeenCalledTimes(1);
    expect(component.error()).toBe('Không thể phát video này. Vui lòng thử lại.');
    expect(component.isLoading()).toBeFalse();
  });
});
