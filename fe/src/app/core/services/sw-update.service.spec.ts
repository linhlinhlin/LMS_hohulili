import { isRuntimeChunkLoadFailure } from './sw-update.service';

describe('isRuntimeChunkLoadFailure', () => {
  it('detects dynamic import failures surfaced via unhandled rejection', () => {
    expect(isRuntimeChunkLoadFailure({
      message: 'Failed to fetch dynamically imported module: https://holilihu.online/chunk-ABC.js',
    })).toBeTrue();
  });

  it('detects classic ChunkLoadError messages', () => {
    expect(isRuntimeChunkLoadFailure({
      message: 'ChunkLoadError: Loading chunk 42 failed.',
    })).toBeTrue();
  });

  it('ignores unrelated runtime failures', () => {
    expect(isRuntimeChunkLoadFailure({
      message: 'WebSocket connection to wss://holilihu.online/ws failed',
    })).toBeFalse();
  });
});
