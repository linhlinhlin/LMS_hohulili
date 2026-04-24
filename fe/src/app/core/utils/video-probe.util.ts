/**
 * Client-side video metadata probe.
 *
 * Reads duration, resolution, and captures a poster frame from a local File
 * before upload — so the UI can confirm what the user is uploading and show
 * a thumbnail in the processing card (SOTA pattern from YouTube Studio / Vimeo).
 *
 * Pure client-side: uses HTMLVideoElement + canvas. No network calls.
 * Safe if probe fails — returns null fields instead of throwing.
 */

export interface VideoProbeResult {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  posterDataUrl: string | null;
}

const POSTER_CAPTURE_SECOND = 1.0;
const POSTER_MAX_WIDTH = 320;
const PROBE_TIMEOUT_MS = 8000;

export async function probeVideoFile(file: File): Promise<VideoProbeResult> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = objectUrl;

  const result: VideoProbeResult = {
    durationSeconds: null,
    width: null,
    height: null,
    posterDataUrl: null,
  };

  const cleanup = () => {
    try {
      video.src = '';
      video.load();
    } catch { /* noop */ }
    URL.revokeObjectURL(objectUrl);
  };

  try {
    await waitForMetadata(video);
    result.durationSeconds = isFinite(video.duration) ? video.duration : null;
    result.width = video.videoWidth || null;
    result.height = video.videoHeight || null;

    try {
      result.posterDataUrl = await capturePosterFrame(video);
    } catch {
      // Poster is best-effort; metadata is enough.
    }
  } catch {
    // Probe failed — return empty result, caller falls back to filename only.
  } finally {
    cleanup();
  }

  return result;
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('probe-timeout')), PROBE_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('error', fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('error', fail);
      reject(new Error('probe-error'));
    };
    video.addEventListener('loadedmetadata', done);
    video.addEventListener('error', fail);
  });
}

async function capturePosterFrame(video: HTMLVideoElement): Promise<string> {
  const seekTarget = Math.min(POSTER_CAPTURE_SECOND, (video.duration || 1) / 2);
  await seekTo(video, seekTarget);

  const canvas = document.createElement('canvas');
  const ratio = video.videoHeight && video.videoWidth ? video.videoHeight / video.videoWidth : 9 / 16;
  canvas.width = Math.min(POSTER_MAX_WIDTH, video.videoWidth || POSTER_MAX_WIDTH);
  canvas.height = Math.round(canvas.width * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('seek-timeout')), 3000);
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    try {
      video.currentTime = seconds;
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatResolution(width: number | null, height: number | null): string {
  if (!width || !height) return '';
  if (height >= 2160) return `${width}×${height} · 4K`;
  if (height >= 1440) return `${width}×${height} · 2K`;
  if (height >= 1080) return `${width}×${height} · 1080p`;
  if (height >= 720) return `${width}×${height} · 720p`;
  if (height >= 480) return `${width}×${height} · 480p`;
  return `${width}×${height}`;
}

/**
 * Heuristic transcode ETA.
 *
 * Cloudflare Stream transcodes ~1.2-2× realtime for H.264 sources at our 3 renditions.
 * Add 20s baseline for ingest/queue, then 1.5× duration as conservative ETA.
 */
export function estimateProcessingSeconds(durationSeconds: number | null): number | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return Math.round(20 + durationSeconds * 1.5);
}
