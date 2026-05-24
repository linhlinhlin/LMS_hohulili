import {
  isOnlineOnlyVideoSource,
  isYoutubeVideoUrl,
} from './video-offline-policy';

describe('video-offline-policy', () => {
  it('detects common YouTube URL forms as online-only sources', () => {
    expect(isYoutubeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeTrue();
    expect(isYoutubeVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBeTrue();
    expect(isYoutubeVideoUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBeTrue();
  });

  it('treats YouTube metadata and explicit external sources as online-only', () => {
    expect(isOnlineOnlyVideoSource({ videoType: 'YOUTUBE' })).toBeTrue();
    expect(isOnlineOnlyVideoSource({ videoSourceKind: 'EXTERNAL' })).toBeTrue();
    expect(isOnlineOnlyVideoSource({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })).toBeTrue();
  });

  it('keeps internal adaptive and direct LMS sources eligible for offline handling', () => {
    expect(isOnlineOnlyVideoSource({ videoSourceKind: 'ADAPTIVE_R2' })).toBeFalse();
    expect(isOnlineOnlyVideoSource({ videoSourceKind: 'STREAM' })).toBeFalse();
    expect(isOnlineOnlyVideoSource({ videoUrl: '/api/v3/media/video.mp4' })).toBeFalse();
  });
});
