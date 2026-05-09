import { shouldShowMediaNetworkHint, type MediaNetworkHintState } from './adaptive-video-player.component';

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
