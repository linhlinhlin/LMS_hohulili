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

- GCP project: `the-wiii-lab`
- Region / zone: `asia-southeast1-c`
- Verified on: `2026-04-28` with `gcloud compute instances list`

### App VM

- name: `lms-production`
- machine type: `e2-standard-2`
- public IP: `35.187.245.201`
- private IP: `10.148.0.4`
- role:
  - backend
  - frontend
  - caddy
  - postgres

### Dedicated ingest worker VM

- historical name: `lms-video-worker`
- current verification note: no `lms-video-worker` instance was present in project `the-wiii-lab` on `2026-04-28`
- action before worker-specific operations: verify the current ingest topology with `gcloud compute instances list`

### Storage split

- public/general assets: `lms-cdn`
- private learner video/storage: `lms-storage`

### Playback split

- manifest / entitlement / playback session token: backend on `holilihu.online`
- HLS/DASH media objects: Cloudflare Worker custom domain on `media.holilihu.online`

## Runtime truths to remember

- Historical video-worker runbooks may mention a dedicated worker VM. Current GCP discovery only shows `lms-production`; verify worker presence before relying on worker-specific commands.
- If a dedicated worker VM is re-enabled, it should reach PostgreSQL through a private forward on the app VM.
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
- If a dedicated worker VM exists and fails DB boot after an app VM restart, inspect the private PostgreSQL forwarder on `lms-production` before suspecting code regressions.
