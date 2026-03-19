# Media Domain And Edge Auth Plan

Last updated: 2026-03-19

## Executive summary

The current adaptive playback path is functionally correct, but it is still backend-mediated for every media object fetch.

Today the backend:

- mints a playback token
- rewrites manifests to backend URLs
- receives object requests
- issues `302` redirects to presigned R2 URLs

This is safe, but it amplifies backend request volume when many learners watch the same asset.

The best next playback-scaling step is:

- keep manifest authorization in the LMS backend for now
- move segment/init object delivery onto a custom media domain on Cloudflare
- enforce edge authorization on that media domain
- let Cloudflare Cache serve repeated segment requests without the backend in the hot path

## Current implementation in this repo

Current hot path in code:

- [AdaptiveVideoPlaybackService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/AdaptiveVideoPlaybackService.java)
- [AdaptiveVideoPlaybackController.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/AdaptiveVideoPlaybackController.java)
- [VideoPlaybackTokenService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/VideoPlaybackTokenService.java)

Current flow:

1. learner calls `lesson/section video play`
2. backend entitlement-checks and mints LMS playback JWT
3. backend serves HLS or DASH manifest
4. manifest points to backend `/object` routes
5. backend validates token on every media object request
6. backend returns `302` to an R2 presigned URL

This keeps bytes off the backend, but not requests.

## Root cause chain

### Symptom

Concurrent viewers on one asset still create a meaningful amount of backend traffic.

### Why chain

1. Why does the backend still see a lot of traffic?
   - because every segment/init fetch still passes through a backend controller first
2. Why does each segment need the backend?
   - because authentication currently relies on LMS-minted JWT plus backend redirect logic
3. Why is that a scale problem?
   - because segment fetches dominate request count during playback, especially with audio + video tracks and seeking
4. Why can Cloudflare not simply cache the current presigned R2 URLs?
   - because R2 presigned URLs use the S3 API domain, and Cloudflare documents that presigned URLs cannot be used with custom domains
5. Root cause
   - the current auth model is bound to backend-mediated presigned redirects instead of edge-verifiable authorization on a cacheable custom media domain

## SOTA comparison

| Aspect | Current repo | Better pattern | Gap |
|--------|--------------|----------------|-----|
| Segment auth | backend validates every object request | edge validates request | backend still in hot path |
| Segment origin | R2 S3 presigned URL | custom media domain | S3 API path limits CDN behavior |
| Cache sharing | limited by redirect flow | strong shared edge cache | repeated concurrent requests still hit backend |
| Manifests | backend-generated and rewritten | backend-generated first, maybe edge later | acceptable for now |
| Playback scale | LMS-grade | CDN-grade | missing edge auth + media domain |

## Official constraints from Cloudflare

Cloudflare’s current docs say:

- R2 custom domains unlock Cloudflare Cache, WAF custom rules, and access control.
- `r2.dev` is not for production and should be disabled if access controls matter.
- presigned URLs work only with the S3 API domain and cannot be used with custom domains.
- WAF HMAC token authentication requires Pro, Business, or Enterprise.
- `Ignore Query String` is available on Free, Pro, Business, and Enterprise cache rules.

Implication:

- if the zone has Pro or above, the cleanest next step is `custom media domain + WAF HMAC validation`
- if the zone is Free, the fallback is a Worker-based validation path instead of WAF HMAC

## Option analysis

### Option A — stay on backend redirects

Pros:

- already working
- no Cloudflare changes

Cons:

- backend stays in the per-segment control plane
- not the right target for many concurrent viewers

Decision:

- keep only as baseline

### Option B — Worker in front of private R2 bucket

Pros:

- works even without WAF HMAC plan support
- auth logic can be fully custom

Cons:

- more custom code at the edge
- cache behavior is less straightforward than native custom-domain bucket delivery
- higher operational complexity for a first scaling step

Decision:

- good fallback if the zone is Free

### Option C — custom R2 media domain + WAF HMAC + cache rules

Pros:

- most Cloudflare-native path
- lets Cloudflare Cache serve the same segment repeatedly
- backend can leave the segment hot path
- fits immutable packaged media well

Cons:

- needs Pro+ for WAF HMAC
- bucket becomes public through the custom domain, so edge auth must be correct and `r2.dev` must be disabled

Decision:

- recommended first-class path if plan allows

### Option D — cookie-based edge auth for fully static manifests

Pros:

- best long-term cache sharing
- cleaner URLs
- can eventually let manifests also come from edge more directly

Cons:

- more complex than query-token phase
- requires more careful player/cookie/CORS design

Decision:

- later phase after query-token edge auth is proven

## Recommended rollout

### Phase 2A — recommended next step

Keep manifests on the LMS backend, but send media objects to a custom media domain.

Design:

- add `media.holilihu.online` as a custom domain for `lms-storage`
- disable `r2.dev` on the media bucket
- keep manifests served by the LMS backend
- rewrite object URLs inside manifests to:
  - `https://media.holilihu.online/video-packages/<assetId>/...?...`
- attach an edge-verifiable HMAC token in the query string
- configure Cloudflare WAF to validate the token
- configure Cloudflare Cache on the media domain to ignore the auth query string in the cache key

Why this is the best incremental step:

- backend still controls entitlement and manifest issuance
- segments no longer need backend redirects
- cache sharing improves dramatically because query strings no longer fragment the cache key

## Concrete Cloudflare configuration

### Media domain

- hostname: `media.holilihu.online`
- target bucket: `lms-storage`
- access path: custom domain, not `r2.dev`

### Cache

On `media.holilihu.online/video-packages/*`:

- mark eligible for cache
- ignore query string in the cache key
- enable Smart Tiered Cache

This is a good fit because packaged segments and init files are immutable.

### Auth

If the zone is Pro+:

- use WAF token authentication with `is_timed_hmac_valid_v0()`
- validate a `verify` query parameter on media requests

Two implementation choices:

1. per-object token
   - simplest to wire from the current backend manifest rewriter
   - backend signs each object path that appears in the manifest
2. per-prefix token
   - one token can cover a fixed asset path prefix
   - cleaner, but slightly trickier to implement and validate

Recommendation:

- start with per-object token because it maps directly to the current manifest rewrite code

## Backend changes for Phase 2A

Smallest useful code change:

1. keep `createPlaybackSession(...)` as the learner-facing entry
2. keep manifest rendering in the backend
3. stop generating backend `/object` URLs inside manifests
4. instead generate direct media-domain URLs with HMAC query tokens

Example target URL shape:

```text
https://media.holilihu.online/video-packages/<assetId>/hls/720p/seg-001.ts?verify=<hmac-token>
```

Result:

- backend still sees manifest requests
- backend no longer sees the dominant segment/init request volume

## Phase 2B — better long-term edge auth

After Phase 2A is stable:

- move from per-object query tokens toward cookie/session-based edge auth
- reduce manifest variance
- optionally serve child playlists/manifests more directly from edge

This is the phase where the system starts to look more like a managed CDN delivery model.

## Worker VM and playback scale are separate concerns

Dedicated worker VM:

- helps `upload -> READY`
- helps queue throughput
- protects the web app from `ffmpeg`

It does not by itself solve segment delivery scale.

Playback scale:

- needs custom media domain + edge auth + cache strategy

These two tracks should be executed separately.

## Rollout sequence

1. keep current production playback path as fallback
2. provision `media.holilihu.online` on `lms-storage`
3. disable `r2.dev` for the media bucket
4. add cache rules for media paths
5. add WAF HMAC rule if the plan allows it
6. add backend support to rewrite manifests to media-domain object URLs
7. smoke one asset end-to-end
8. load-test many viewers on one asset
9. only then retire backend `/object` playback path

## Recommendation summary

Best next scaling move for playback is:

- `media.holilihu.online` custom domain on `lms-storage`
- backend-served manifests
- direct media-domain segment URLs
- edge auth using WAF HMAC if available
- cache key configured to ignore auth query strings

If the zone is Free and WAF HMAC is unavailable:

- use a Worker-based validation path as the fallback design

## References

- Cloudflare R2, `Public buckets`:
  [https://developers.cloudflare.com/r2/buckets/public-buckets/](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- Cloudflare R2, `Presigned URLs`:
  [https://developers.cloudflare.com/r2/api/s3/presigned-urls/](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- Cloudflare WAF, `Configure token authentication`:
  [https://developers.cloudflare.com/waf/custom-rules/use-cases/configure-token-authentication/](https://developers.cloudflare.com/waf/custom-rules/use-cases/configure-token-authentication/)
- Cloudflare Rules Snippets, `Sign requests`:
  [https://developers.cloudflare.com/rules/snippets/examples/signing-requests/](https://developers.cloudflare.com/rules/snippets/examples/signing-requests/)
- Cloudflare Cache, `Cache keys`:
  [https://developers.cloudflare.com/cache/how-to/cache-keys/](https://developers.cloudflare.com/cache/how-to/cache-keys/)
- Cloudflare Cache, `Default cache behavior`:
  [https://developers.cloudflare.com/cache/concepts/default-cache-behavior/](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
