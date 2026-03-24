# Production Surfaces

This document records the current production public surfaces and topology for smoke testing, incident response, and operational handoff.

## Public surfaces

- Main site: `https://holilihu.online`
- Same-origin API: `https://holilihu.online/api/*`
- Health: `https://holilihu.online/actuator/health`
- Wiii: `https://wiii.holilihu.online`
- Public CDN assets: `https://cdn.holilihu.online`
- Private media delivery: `https://media.holilihu.online`

## Current production topology

- GCP project: `valued-range-443614-j4`
- Region / zone: `asia-southeast1-b`

### App VM

- name: `lms-production`
- machine type: `e2-medium`
- private IP: `10.148.0.2`
- role:
  - backend
  - frontend
  - caddy
  - postgres

### Dedicated ingest worker VM

- name: `lms-video-worker`
- machine type: `e2-standard-4`
- private IP: `10.148.0.4`
- role:
  - `video-worker`

### Storage split

- public/general assets: `lms-cdn`
- private learner video/storage: `lms-storage`

### Playback split

- manifest / entitlement / playback session token: backend on `holilihu.online`
- HLS/DASH media objects: Cloudflare Worker custom domain on `media.holilihu.online`

## Runtime truths to remember

- Local `video-worker` on the app VM is intentionally disabled in production.
- The dedicated worker VM is the production ingest path.
- The worker VM reaches PostgreSQL through a private forward on the app VM.
- That private DB path is expected to use `sslmode=disable` on the worker JDBC URL unless the forward terminates PostgreSQL SSL itself.
- If the PostgreSQL forwarder on the app VM uses `socat`, it must resolve the current `lms-db-1` container IP dynamically instead of pinning a stale Docker IP.
- Cloudflare Free production edge auth is implemented through a Worker custom domain, not WAF token rules.

## Post-deploy smoke surfaces

- login
- course browse / course detail
- teacher curriculum/editor
- learner lesson view
- payment modal / payment callback
- payment history
- admin finance / payout guards
- PWA reset and reinstall when service-worker-sensitive changes ship

## Operational warnings

- A stale service worker can invalidate smoke results if site data is not reset first.
- Payment smoke should avoid triggering real financial side effects unless that is the explicit purpose of the run.
- Production smoke should use fixture accounts with known state.
- If `media.holilihu.online` starts returning `404` instead of `403/200`, verify the Worker custom domain and route before blaming backend playback logic.
- If the dedicated worker VM fails DB boot after an app VM restart, inspect the private PostgreSQL forwarder on `lms-production` before suspecting code regressions.
