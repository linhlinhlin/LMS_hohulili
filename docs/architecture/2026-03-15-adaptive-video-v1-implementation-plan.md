# Adaptive Video V1 Implementation Plan

> **Date**: 2026-03-15  
> **Status**: Team implementation plan  
> **Scope**: Teacher internal video authoring -> learner playback -> offline/PWA for section-based lessons  
> **Audience**: FE team, BE team, QA, release owners

---

## 1. Executive Summary

The current LMS already has useful building blocks for streaming video:

- Cloudflare Stream integration exists on the backend.
- Signed playback and quality-specific download URLs exist at the lesson level.
- The frontend already contains Shaka Player as a dependency.
- The offline/PWA stack already exists with Dexie, Angular Service Worker, and a course download pipeline.

However, the runtime model is still inconsistent:

- Internal video identity is still partly attached to `lesson.streamVideoUid`.
- Actual learner playback is not fully standardized around section-first video.
- Offline/download UX still risks treating YouTube/external video like downloadable internal video.
- The teacher authoring, learner playback, and offline pipeline are not yet governed by one clear contract.

This document defines that contract for **V1**.

**V1 target**

- Internal LMS video uses **Cloudflare Stream + signed HLS + Shaka player**.
- YouTube remains a separate playback path.
- Stream identity becomes **section-first**.
- Legacy lesson-level stream identity remains **read-only compatibility** during the transition.
- Offline only applies to **internal LMS video**, not YouTube.

---

## 2. Product Decision Summary

### 2.1 What counts as “internal video”

An internal LMS video is any `VIDEO` lesson or `VIDEO` section that is uploaded into the LMS and backed by Cloudflare Stream.

**Source of truth**

1. `section.streamVideoUid`
2. legacy fallback `lesson.streamVideoUid` only if the lesson has a single video block and the section itself has no stream UID

### 2.2 What counts as “external video”

- YouTube
- other raw external video URLs

These may still be playable online, but they are **not** part of the internal adaptive/offline guarantee.

### 2.3 V1 promise to users

For internal LMS videos:

- teacher can upload them into a video section
- student can watch them with adaptive playback
- weak networks degrade quality instead of freezing as often
- downloaded courses can replay internal video offline

For YouTube:

- online playback remains supported
- offline is not supported in V1

---

## 3. What “Done” Means

This batch is only considered complete when all of the following are true:

1. Teacher can create or edit a `VIDEO` section and upload an internal video without losing stream identity.
2. Learner can open a `VIDEO` section with internal video and play it through Shaka on production.
3. Legacy content that still only has `lesson.streamVideoUid` continues to play.
4. Download dialog shows accurate behavior:
   - internal Cloudflare video participates in size calculation
   - YouTube/external video is clearly marked online-only
5. Downloaded internal video can be replayed offline through the PWA path.
6. No new CSP/service worker regressions are introduced.

---

## 4. Industry Principles Behind This Plan

This plan follows a few strong patterns used by major platforms and official docs:

- **Apple HLS**: HLS is designed to adapt to changing network conditions and use standard HTTP/CDN delivery. For web playback, HLS remains the most interoperable choice for Apple-heavy environments.  
  Source: [Apple HTTP Live Streaming overview](https://developer.apple.com/documentation/http-live-streaming)

- **Cloudflare Stream**: Cloudflare Stream already provides adaptive bitrate output and supports custom HLS/DASH playback with signed URLs.  
  Sources: [Cloudflare Stream overview](https://developers.cloudflare.com/stream/), [Use your own player](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/)

- **Shaka Player**: Shaka is appropriate here because it supports configurable ABR, buffering, retry behavior, and offline-aware playback patterns. It explicitly recommends avoiding naive service-worker caching for segment playback.  
  Sources: [Shaka configuration](https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html), [Network and buffering configuration](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html), [Service worker caching guidance](https://shaka-player-demo.appspot.com/docs/api/tutorial-service-worker.html), [Offline storage and playback](https://shaka-player-demo.appspot.com/docs/api/tutorial-offline.html)

- **MDN PWA guidance**: Background sync is appropriate for short sync work, but not for large media downloads; long media download behavior should remain explicit and user-driven.  
  Sources: [MDN offline and background operation](https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation), [MDN Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

---

## 5. In Scope vs Out of Scope

### In scope for V1

- section-first internal video identity
- internal video upload for `VIDEO` section
- signed HLS playback for learner
- Shaka-based adaptive playback for internal video
- legacy lesson-level compatibility
- internal-video offline download/replay
- QoE collection hooks from learner player
- clear UX distinction between internal and YouTube video

### Out of scope for V1

- DRM / FairPlay / Widevine
- LL-HLS tuning
- re-streaming YouTube through LMS infrastructure
- subtitle/transcript management
- per-section author analytics dashboard
- server-side persistence pipeline for QoE beyond a stable client-side contract

---

## 6. Canonical Data Model

### 6.1 Section-first video identity

For a `VIDEO` section, the canonical fields are:

- `videoUrl`
- `videoType`
- `streamVideoUid`
- `videoOfflineUri`

### 6.2 Required semantics

#### Internal Cloudflare video

- `videoType = CLOUDFLARE`
- `streamVideoUid != null`
- `videoUrl` may contain a playable HLS URL or fallback URL, but it is not the identity

#### YouTube

- `videoType = YOUTUBE`
- `streamVideoUid = null`
- `videoUrl` contains the YouTube URL

#### External raw URL

- `videoType = null` or `EXTERNAL` if standardized later
- `streamVideoUid = null`
- `videoUrl` contains the raw external URL

### 6.3 Legacy compatibility rule

If:

- section has no `streamVideoUid`
- lesson has `lesson.streamVideoUid`
- lesson contains exactly one video block

then learner APIs may resolve the section playback/download against `lesson.streamVideoUid`.

This fallback must remain **read-only compatibility**, not the preferred write path.

---

## 7. UX / UI Requirements

## 7.1 Teacher authoring UX

### Goal

A teacher editing a `VIDEO` section should understand:

- whether the video is YouTube/external or internal
- whether an internal upload is merely selected, uploading, processing, or ready
- whether changing source type clears the old internal identity

### Requirements

1. The video section editor must show **two clear modes**:
   - `Dán liên kết`
   - `Tải video nội bộ`

2. For internal uploads:
   - new section: file is staged until the section shell exists, then uploaded
   - existing section: file uploads immediately to that section

3. The UI must display:
   - selected file name
   - upload state
   - success state
   - retry state on failure

4. If the user switches from internal video to URL mode:
   - `streamVideoUid` must be cleared intentionally
   - UI should make that destructive switch obvious

5. If the user edits a section that already has internal video:
   - the modal must rehydrate from `streamVideoUid`
   - it must not silently downgrade to plain URL-only semantics

### UX copy requirements

- internal upload success should mention that playback quality is adaptive
- YouTube/external mode should not imply offline availability

## 7.2 Learner playback UX

### Internal video

The learner should see:

- one unified video shell
- loading state
- buffering state
- degraded network hint when quality drops or buffering rises
- completion badge/progress continuity

### YouTube

YouTube must keep its own player path, but the surrounding lesson shell should remain visually consistent:

- same spacing
- same title hierarchy
- same completion behavior
- same section navigation context

## 7.3 Offline UX

Download UI must behave honestly:

- internal LMS video contributes to offline size
- YouTube/external video does not
- if a course has online-only videos, the dialog must say so

The learner should never think a YouTube section was downloaded for offline playback.

---

## 8. Backend Implementation Requirements

## 8.1 Section-first endpoints

The backend contract should expose:

- `POST /api/v3/sections/{sectionId}/video`
- `GET /api/v3/sections/{sectionId}/video/play`
- `GET /api/v3/sections/{sectionId}/video/download?quality=...`
- `GET /api/v3/sections/{sectionId}/video/sizes`
- `DELETE /api/v3/sections/{sectionId}/video`

### Required behavior

#### Upload

- persists `streamVideoUid` into the matching section block
- sets `videoType = CLOUDFLARE`
- updates `videoUrl` with a valid playback-compatible URL or retained fallback
- if replacing an existing internal stream, old stream cleanup must be best-effort

#### Play

- returns signed playback URL for the resolved stream identity
- enforces learner access rules

#### Download

- returns quality-specific download URL for offline use
- enforces learner access rules

#### Sizes

- returns per-quality sizes for internal video if available
- supports section identity first, lesson fallback second

#### Delete

- removes section stream identity
- should not accidentally erase legacy lesson identity if multiple video blocks exist

## 8.2 Persistence model

Because section content is currently persisted through `lessons.content_blocks` JSONB, section video metadata must be written into the correct content block payload.

The team should **not** create a fake parallel source of truth for video metadata.

### Minimum block payload for internal video

```json
{
  "title": "Radar overview",
  "videoType": "CLOUDFLARE",
  "videoUrl": "https://.../manifest/video.m3u8",
  "streamVideoUid": "..."
}
```

## 8.3 Access rules

### Teacher upload/delete

- owner teacher
- `ADMIN`
- `ORG_ADMIN` only if current product policy explicitly allows it

### Learner play/download

- free lesson or free course: allowed
- otherwise payment/enrollment guard must match existing learner access rules

### Important review point

Avoid broad role bypasses such as “any `TEACHER` can access any learner video”.  
Teacher bypass should ideally mean owner teacher or privileged admin, not every teacher in the system.

---

## 9. Frontend Implementation Requirements

## 9.1 Teacher authoring

Files already expected to be central:

- [course-curriculum.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.ts)
- [curriculum-section-modal.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/teacher/course-editor/pages/course-curriculum/components/curriculum-section-modal/curriculum-section-modal.component.ts)

### Required behavior

1. New section create:
   - create section shell first
   - upload file after section exists
   - rollback newly created section only if upload fails and product wants transactional semantics

2. Existing section edit:
   - upload immediately
   - reflect success/failure in modal

3. Save payload for `VIDEO` section must carry:
   - `videoUrl`
   - `videoType`
   - `streamVideoUid`

## 9.2 Learner playback

Files expected to remain central:

- [adaptive-video-player.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/learning/components/adaptive-video-player/adaptive-video-player.component.ts)
- [lesson-content.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts)
- [youtube-player.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/learning/components/youtube-player/youtube-player.component.ts)

### Source resolution order

For internal video:

1. `videoOfflineUri`
2. signed section play URL from `streamVideoUid`
3. legacy lesson play URL fallback
4. raw `videoUrl`

### Shaka configuration baseline

Use a conservative profile suitable for unstable maritime networks:

- ABR enabled
- modest default bandwidth estimate
- higher buffering goal than typical consumer defaults
- rebuffering goal lower than buffering goal
- segment retry with backoff

The exact numbers may be tuned during QA, but the profile must optimize for **continuity over aggressive quality**.

## 9.3 Download dialog / offline UX

The dialog must aggregate video size from **video assets**, not only from lesson-level stream fields.

### Required behaviors

- section-level Cloudflare video contributes real size when available
- lesson-level legacy stream contributes real size when applicable
- YouTube/external video is explicitly shown as online-only

---

## 10. Offline and PWA Requirements

## 10.1 Core rule

Offline in V1 is only guaranteed for **internal LMS video**.

## 10.2 Download pipeline

`CourseDownloadService` must:

- detect section video assets
- use section download endpoint when `section.streamVideoUid` exists
- write `videoOfflineUri` back to the section payload in IndexedDB

## 10.3 Replay pipeline

Learner video resolution must always prefer:

1. `videoOfflineUri`
2. section signed play URL
3. legacy lesson play URL
4. raw online URL

## 10.4 Service worker rule

Do **not** rely on generic service-worker segment caching as the primary offline video strategy.

Shaka’s own guidance warns that naive service-worker caching can interfere with bandwidth estimation and offline playback semantics. The LMS should continue to use:

- explicit download flow
- explicit offline URIs / local blob-backed paths
- controlled offline playback routing

Source: [Shaka service worker caching guidance](https://shaka-player-demo.appspot.com/docs/api/tutorial-service-worker.html)

---

## 11. QoE and Telemetry Contract

The player must collect, at minimum:

- startup time
- rebuffer count
- total buffer time
- bitrate switches
- average bitrate or latest bitrate
- playback errors
- total play time

### V1 requirement

If backend persistence is not ready, the client-side contract must still be stable so future ingestion can be attached without rewriting the player lifecycle.

The player should expose a single session-finalization point where these metrics are finalized before teardown.

---

## 12. QA / Acceptance Checklist

## 12.1 Teacher flow

1. Create a new lecture lesson.
2. Add a `VIDEO` section.
3. Upload an internal video.
4. Save.
5. Reopen the section.

Expected:

- stream identity persists
- modal shows internal-video-ready state
- no accidental downgrade to plain URL mode

## 12.2 Learner internal video

1. Open a course with a section internal video.
2. Play on normal network.
3. Throttle to Slow 3G/high latency.

Expected:

- player still starts within a reasonable delay
- quality drops rather than freezing indefinitely
- buffering state is visible and non-broken

## 12.3 Legacy lesson fallback

1. Use a lesson that only has `lesson.streamVideoUid`.
2. Open the corresponding learner lesson.

Expected:

- playback still works
- no migration is required to keep old content alive

## 12.4 YouTube

1. Open a section with YouTube video.

Expected:

- still plays online
- never appears as downloadable internal video

## 12.5 Offline

1. Download a course with internal section video.
2. Install/refresh PWA.
3. Go offline.
4. Reopen the downloaded lesson.

Expected:

- text loads
- internal video uses offline path
- YouTube section clearly remains online-only

---

## 13. Rollout Plan

## Phase A: Contract completion

- finish section-first API and tests
- finish teacher section upload flow
- finish learner adaptive player integration
- finish download dialog and offline section video path

## Phase B: Non-production smoke

- local/dev smoke
- one seeded internal-video lesson
- one seeded YouTube lesson
- one legacy lesson-level stream fixture

## Phase C: Production rollout

- deploy with Cloudflare Stream enabled
- verify signed playback
- verify CSP/media-src/frame-src correctness
- verify no service-worker regressions

## Phase D: Post-deploy observation

- watch learner console noise
- sample QoE metrics from client logs if available
- verify offline replay on at least one real mobile device

---

## 14. Implementation Notes for the Current Repo

The current repo already contains partial work toward this plan. Team implementation should use the current worktree as input, but **this document is the source of truth**, not any partially wired branch state.

In particular, before calling the batch complete, verify:

- no stray fallback text remains in learner video templates
- no old lesson-first assumptions remain in download dialog or offline video estimation
- no permission bypass unintentionally grants every teacher access to any paid video

---

## 15. Review Checklist for Follow-Up Pass

When the team reports implementation complete, the review pass should check:

1. Does the final UI still distinguish internal video vs YouTube clearly?
2. Does a section-first upload really persist into the correct content block?
3. Does learner playback truly use signed section play URLs?
4. Does legacy lesson fallback still work?
5. Does offline replay use `videoOfflineUri` before any network attempt?
6. Does download size estimation match section-first reality?
7. Are there any CSP, service worker, or console regressions?

---

## 16. References

- Apple HTTP Live Streaming: [https://developer.apple.com/documentation/http-live-streaming](https://developer.apple.com/documentation/http-live-streaming)
- Apple HLS offline/persist example: [https://developer.apple.com/documentation/AVFoundation/using-avfoundation-to-play-and-persist-http-live-streams](https://developer.apple.com/documentation/AVFoundation/using-avfoundation-to-play-and-persist-http-live-streams)
- Cloudflare Stream overview: [https://developers.cloudflare.com/stream/](https://developers.cloudflare.com/stream/)
- Cloudflare Stream custom player docs: [https://developers.cloudflare.com/stream/viewing-videos/using-own-player/](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/)
- Cloudflare Stream resumable uploads: [https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/](https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/)
- Shaka Player configuration: [https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html](https://shaka-player-demo.appspot.com/docs/api/tutorial-config.html)
- Shaka network and buffering config: [https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html](https://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html)
- Shaka offline storage and playback: [https://shaka-player-demo.appspot.com/docs/api/tutorial-offline.html](https://shaka-player-demo.appspot.com/docs/api/tutorial-offline.html)
- Shaka service worker caching guidance: [https://shaka-player-demo.appspot.com/docs/api/tutorial-service-worker.html](https://shaka-player-demo.appspot.com/docs/api/tutorial-service-worker.html)
- MDN offline and background operation: [https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation](https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- MDN Background Sync API: [https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

