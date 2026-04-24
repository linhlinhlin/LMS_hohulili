# Media Domain + Edge Auth Design

Last updated: 2026-03-19
Status: Design approved for implementation planning

## 1. Problem statement

The current adaptive playback pipeline is production-correct, but not yet production-efficient for a large number of concurrent viewers on the same asset.

Current learner flow:

1. LMS backend entitlement-checks the learner.
2. Backend mints a playback JWT.
3. Backend renders HLS or DASH manifests.
4. Every segment or init object request still goes back through the LMS backend.
5. Backend validates the playback token and issues `302` redirects to R2 presigned URLs.

This protects access, but it keeps the backend in the request path for the highest-volume playback traffic.

## 2. Goals

- remove the LMS backend from the hot path for segment and init object delivery
- preserve LMS entitlement checks as the source of truth
- keep adaptive playback private
- let Cloudflare Cache serve repeated requests for the same immutable media objects
- preserve compatibility with the current `videoAssetId -> playUrl` contract

## 3. Non-goals

- replacing the current ingest pipeline
- moving manifests fully out of the LMS backend in phase 1
- DRM
- changing learner-facing course entitlement policy
- replacing R2 with another video origin

## 4. Current repo touchpoints

Current implementation boundary:

- [AdaptiveVideoPlaybackService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/AdaptiveVideoPlaybackService.java)
- [AdaptiveVideoPlaybackController.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/AdaptiveVideoPlaybackController.java)
- [VideoPlaybackTokenService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/VideoPlaybackTokenService.java)

Current hotspot:

- manifests are backend-rendered and rewritten
- object URLs currently target LMS `/object` endpoints
- `/object` endpoints sign and redirect to R2 presigned URLs

## 5. Approach options

### Option A — keep backend redirects

Pros:

- already working
- smallest operational surface

Cons:

- backend remains in the hottest request path
- not the right shape for high concurrency

Decision:

- reject as the long-term target

### Option B — Worker-only edge validation

Pros:

- works on Cloudflare Free
- flexible custom auth logic

Cons:

- more custom edge code
- more moving parts for the first scale step

Decision:

- keep as fallback if the zone cannot use WAF HMAC auth

### Option C — custom media domain + WAF HMAC + cache rules

Pros:

- closest Cloudflare-native design
- best fit for immutable HLS/DASH segment objects
- removes backend from per-object control plane

Cons:

- depends on Cloudflare plan features for WAF HMAC
- requires careful cache-key design so auth query strings do not fragment cache

Decision:

- recommended primary design

## 6. Recommended architecture

### Phase 1

Keep manifest issuance on the LMS backend, but move segment/init delivery to a custom media domain.

Flow:

1. learner requests `lesson/section video play`
2. LMS backend entitlement-checks
3. LMS backend mints playback JWT
4. LMS backend renders manifest
5. manifest object URLs point to:
   - `https://media.holilihu.online/video-packages/<assetId>/...`
6. each media URL carries a short-lived edge-verifiable HMAC token
7. Cloudflare edge validates the token
8. Cloudflare Cache serves the object if available
9. only cache misses hit the underlying R2 media bucket

### Why manifests stay on the backend first

- entitlement logic is already correct and tested there
- change scope stays smaller
- rollout can be incremental
- fallback to current backend object redirect path remains easy

## 7. Data and auth model

### Current auth

- LMS playback JWT
- validated by backend on every object fetch

### New auth split

Two layers:

1. LMS playback JWT
   - still used to gate the initial playback session and manifest request
2. edge HMAC token
   - used only for media-domain object access

### Token shape

Recommended phase-1 token:

- query parameter `verify=...`
- covers:
  - request path
  - expiry timestamp
  - optional asset id marker

This maps directly to the current manifest rewrite pattern.

## 8. Media domain

Recommended hostname:

- `media.holilihu.online`

Origin:

- custom domain mapped to `lms-storage`

Important:

- disable `r2.dev` on the media bucket after cutover
- treat the media domain as edge-protected, not generally public

## 9. Cache design

On `media.holilihu.online/video-packages/*`:

- eligible for cache
- cache immutable packaged media objects
- ignore auth query string in cache key
- enable tiered cache if available

Reason:

- HLS/DASH packaged segments and init files are immutable once the asset is `READY`

## 10. Backend changes required

### Smallest useful implementation

1. Add media-domain config:
   - `VIDEO_MEDIA_DOMAIN`
   - `VIDEO_EDGE_AUTH_MODE`
   - `VIDEO_EDGE_HMAC_SECRET`
   - `VIDEO_EDGE_TOKEN_EXPIRY_SECONDS`
2. Keep current play/session endpoints
3. Keep current manifest endpoints
4. Change manifest rewrite logic:
   - stop writing LMS `/object` URLs
   - write direct `https://media.holilihu.online/...?...` URLs instead
5. Keep backend `/object` path as rollback fallback during rollout

### No change required yet

- `VideoAssetIngestService`
- `ShakaPackagerService`
- playback session DTO shape

## 11. Cloudflare configuration required

### On `lms-storage`

- attach custom domain `media.holilihu.online`
- disable public dev URL after rollout

### Access control

Primary path if zone is Pro+:

- WAF token authentication with timed HMAC validation

Fallback if zone is Free:

- Worker validates query token and proxies/fetches origin asset

### Cache

- cache rule for `media.holilihu.online/video-packages/*`
- cache key ignores auth query string

## 12. Rollout plan

### Rollout A — dry prep

1. create media custom domain on `lms-storage`
2. confirm packaged objects are reachable internally
3. leave LMS playback flow unchanged

### Rollout B — edge auth wiring

1. configure WAF HMAC or Worker fallback
2. smoke direct media-domain URL with a valid token
3. smoke expired token
4. smoke tampered path/token

### Rollout C — backend manifest rewrite

1. add media-domain URL rewrite in backend
2. enable behind a feature flag
3. smoke one asset end-to-end

### Rollout D — scale verification

1. load-test many viewers on one asset
2. confirm backend request volume drops
3. confirm edge cache hit ratio improves

### Rollback

- flip manifest rewrite feature flag off
- return to backend `/object` redirect path

## 13. Test plan

### Backend tests

- manifest rewrite produces media-domain URLs
- invalid edge-auth mode falls back safely
- feature flag off returns current backend object URLs

### Security tests

- valid edge token passes
- expired token fails
- tampered path fails
- token for one asset path cannot be replayed on another

### Production smoke

1. learner play HLS
2. learner play DASH
3. segment fetch goes to `media.holilihu.online`
4. valid token returns media bytes
5. invalid token blocked at edge
6. repeat load on same segment shows cache hits

## 14. Success criteria

- learner playback remains correct
- backend no longer handles the dominant segment/init request volume
- cache hit ratio on repeated segment access increases materially
- auth remains private and revocation-by-expiry still works

## 15. Decision summary

Recommended phase:

- backend-served manifests
- direct object URLs on `media.holilihu.online`
- edge HMAC auth
- cache key that ignores auth query params
- backend object redirect path retained as rollback until verified
