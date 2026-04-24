# PWA Device-Offline Gateway Hardening Design

Date: 2026-04-23

Related issues:
- #78 `bug(pwa): offline public course fallback collapses cached downloads to empty lists`
- #79 `bug(pwa): offline fallback page links downloaded courses to non-existent learn route`
- #91 `bug(pwa): device-offline still degrades into gateway timeouts and chunk fetch failures`

## Problem

When the user physically turns off the device network, Angular Service Worker can surface same-origin failures as `502/503/504` or dynamic import rejections instead of the classic `status = 0` browser network error.

The current PWA stack still treats those responses as ordinary server failures in several places, so the app can miss its offline fallback path and leave the UI in a noisy or partially broken state.

## Goals

- Treat `device offline -> synthetic gateway timeout` as an offline-compatible transport failure.
- Preserve the offline fallback and sync queue behavior that already exists for genuine network errors.
- Ensure recovery navigation stays available even when lazy chunks fail offline.
- Avoid reload loops or redundant retries while the device is offline.

## Chosen Approach

### 1. Harden offline transport detection at the interceptor boundary

`offlineInterceptor` will classify a request as offline-compatible when:
- the current behavior already matches (`status === 0`, `ProgressEvent`)
- or the browser/device has just transitioned offline and NGSW surfaces the request as `502/503/504`

This keeps IndexedDB fallback and mutation queueing centralized at the boundary where the rest of the app already expects offline semantics.

### 2. Make network state react immediately to device-offline signals

`NetworkStatusService` will expose a small piece of transient state describing a recent offline signal. This avoids a race where the browser fires the offline event but some in-flight requests still reach the interceptor before all computed UI state has caught up.

### 3. Stop retrying synthetic gateway errors while offline

`errorInterceptor` should not spend an extra second retrying requests that are already known to be offline-equivalent. This removes avoidable noise and reduces the chance of stacked failures during the transition.

### 4. Keep the recovery route in the always-available app shell

`/offline` is a critical recovery surface, so it should not depend on a lazy chunk that may itself fail to load while offline. The route will be eagerly available.

### 5. Catch dynamic import failures caused by offline runtime

`SwUpdateService` will also observe `unhandledrejection` for dynamic import failures. When the device is offline, it should route the user to the recovery surface instead of reloading or leaving the route outlet empty.

## Out Of Scope

- Reworking the entire PWA architecture
- Redesigning offline UX copy from scratch
- Production reverse-proxy or Docker DNS fixes unrelated to device-offline behavior

## Verification Plan

- Add focused unit tests for offline-compatible gateway status detection.
- Add focused unit tests for runtime chunk-failure classification.
- Run targeted frontend specs.
- Run a frontend production build.
- Smoke the offline transition in a browser context after the patch.
