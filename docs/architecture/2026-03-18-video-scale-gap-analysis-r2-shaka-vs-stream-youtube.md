# Video Scale Gap Analysis: R2 + Shaka vs Stream vs YouTube-like Playback

Date: 2026-03-18
Status: Architecture analysis

## Executive summary

The current LMS video stack already implements real adaptive streaming:

- HLS and DASH manifests
- Shaka Player on the frontend
- segmented playback from a private R2 bucket
- backend-signed playback tokens

That means `R2 + Shaka` is technically in the same protocol family as Cloudflare Stream and modern large-scale video platforms.

However, the current production shape is not yet equivalent to a managed video platform or a YouTube-like edge delivery design.

## What the current LMS already does well

### Adaptive playback is real

- Backend packages video into HLS and DASH using `Shaka Packager`.
- Frontend uses `Shaka Player` with ABR enabled.
- Learner playback no longer depends on direct MP4 URLs for asset-backed video.

### Backend is not serving video bytes directly

- The backend renders manifests and validates playback tokens.
- Segment and object requests are redirected to short-lived presigned R2 URLs.

This is better than proxying every media byte through the LMS backend.

## Where the current stack still differs from Stream-grade delivery

### 1. Backend is still in the hot path for every segment request

Current flow:

1. player requests backend manifest URL
2. backend rewrites child URLs
3. player requests backend playlist/object URL
4. backend validates token
5. backend returns `302`
6. browser fetches the presigned R2 object

This means the backend still processes every segment/object request, even if it does not stream the bytes itself.

### 2. Current private delivery path is not designed for shared edge caching

Each redirected object URL is short-lived and presigned.

That is good for security, but it is not the same as a stable cacheable media URL behind a custom domain with edge-side auth. In practice, this reduces the amount of cache sharing between concurrent viewers compared with a dedicated media CDN path.

### 3. Encode ladder is still MVP-grade

The current pipeline is correct, but not yet tuned like a mature video platform:

- no explicit bitrate ladder contract
- no visible GOP/keyframe alignment tuning
- no codec-level optimization beyond `libx264 + CRF + preset`
- no packaging/manifest optimizations targeted at very large spikes

### 4. Production deployment is still single-node

Current production runtime is one backend container on Docker Compose. That is suitable for a growing LMS, but it is not a hyperscale media-control-plane shape.

## YouTube-like buffering question

The common behavior people see on YouTube is:

- adaptive segmented playback
- buffered content ahead of the playhead
- old buffered ranges dropped to save memory

That behavior is not unique to YouTube. It is a standard Media Source Extensions pattern.

Shaka Player documents the same model with:

- `bufferingGoal`
- `rebufferingGoal`
- `bufferBehind`

If `bufferBehind` is exceeded, old content behind the playhead can be removed from the buffer to save memory.

So the idea is the same, but the exact heuristics are platform-specific.

## What the current LMS player does today

Current web player settings:

- `preload="metadata"`
- `bufferingGoal: 30`
- `rebufferingGoal: 8`

Shaka defaults also include `bufferBehind: 30`.

So the current LMS does not implement a "load 5 minutes first" strategy. It buffers roughly tens of seconds, not minutes, and relies on adaptive segmented playback rather than deep prefetch.

## Current readiness assessment

### LMS-grade production

Yes.

The current design is suitable for:

- normal LMS traffic
- classes/cohorts
- learner playback with moderate concurrency
- better UX than direct MP4 delivery

### Stream-grade concurrent spikes

Not yet.

The backend token/redirect path and lack of a cache-friendly media custom-domain path are the main blockers.

### YouTube-like media platform behavior

Not yet.

The current system uses some of the same foundations, but it does not yet have the same level of:

- edge caching
- delivery optimization
- player heuristics
- encoding ladder maturity
- control-plane scaling

## Practical bottleneck model

This is an engineering inference, not a benchmark.

The package output currently uses 6-second segments and separate audio/video tracks. That implies a viewer can generate roughly one audio and one video object request per segment interval.

Approximate steady-state object request rate:

- about `0.33` object requests/second per track
- roughly `0.66` object requests/second per viewer when audio and video are separate

At scale:

- `1,000` concurrent viewers can imply hundreds of backend redirect validations per second
- `10,000` concurrent viewers can imply thousands of backend redirect validations per second

That is where the current single-node backend shape becomes the likely control-plane bottleneck.

## Recommended maturity roadmap

### Phase A: Good LMS production baseline

Keep the current `R2 + Shaka` path and validate it with real smoke and controlled load testing.

### Phase B: Large-cohort hardening

Move the media path toward:

- stable custom-domain delivery for media objects
- Cloudflare edge caching
- edge-side authorization such as Worker/HMAC or Cloudflare token auth
- backend removed from the per-segment hot path

### Phase C: Stream-like delivery posture

Add:

- ladder/GOP tuning
- multi-instance control plane
- manifest/object caching strategy
- synthetic and real concurrency testing
- observability per asset / per profile / per edge path

## Decision for this LMS

If the project goal is:

- finish a strong LMS video pipeline without paying for Stream

then the current `R2 + Shaka` direction is correct.

If the project goal is:

- confidently serve very large concurrent spikes on the same video

then the next architecture step is not "more player tweaks". The next step is changing the delivery path so media becomes edge-cacheable and the backend leaves the segment hot path.
