# Production Report: Telemetry Normalization + VM Recovery

> **Date**: 2026-03-16  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: PASS with one residual non-blocking console issue outside the storage flow

## Summary

This batch had two separate tracks:

1. deploy the offline storage telemetry normalization pass
2. recover the production VM after the first redeploy attempt overloaded the host and left `22/443` unresponsive

The system is now back to healthy runtime, and the telemetry normalization is live.

## What changed

- Admin telemetry analytics now normalize platform labels:
  - `Win32`
  - `windows`
  -> `Windows`
- Admin telemetry analytics now expose `topBrowsers`
- Admin telemetry list rows now include:
  - `normalizedPlatform`
  - `browserFamily`

## Incident during deploy

The first normalization redeploy attempt caused a production incident:

- direct SSH (`22`) timed out
- HTTPS (`443`) timed out
- VM still answered ICMP ping
- serial output showed Docker health-check startup timeout

Evidence from serial:

- `Health check for container ... error: timed out starting health check`

## Recovery actions

The production VM was recovered without a full clean burn:

1. reset instance `lms-production` in `asia-southeast1-b`
2. wait for network and service recovery
3. avoid full parallel deploy
4. redeploy sequentially:
   - backend build + up + health
   - frontend build + up + health

This removed the overload pattern seen in the earlier deploy path.

## Production verification

### Infra

- `GET https://holilihu.online/actuator/health` -> `{"status":"UP"}`
- backend container -> `healthy`
- frontend container -> `healthy`
- Caddy remained healthy after recovery

### Admin telemetry API

- `GET /api/v3/admin/client-telemetry/offline-storage/analytics?days=7&search=student@maritime.edu`
  - `topPlatforms = [{ "label": "Windows", "count": 7 }]`
  - `topBrowsers` present
- `GET /api/v3/admin/client-telemetry/offline-storage?page=0&size=3&search=student@maritime.edu`
  - rows now include:
    - `normalizedPlatform`
    - `browserFamily`

### Playwright smoke

Artifacts:

- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\results.json`
- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\student-storage-actions.json`
- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\student-storage.png`
- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\admin-offline-storage.png`
- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\student-storage-actions.png`

Findings:

- `/student/storage`
  - no JS runtime error
  - no failed LMS API call
  - `Dong bo ngay` action returned `GET /api/v3/sync/pull -> 200`
  - `Yeu cau giu du lieu lau dai` did not break the page
- `/admin/offline-storage`
  - telemetry list loaded `200`
  - analytics loaded `200`

## Residual issue

There is still a non-blocking console issue on `/admin/offline-storage`, but it is outside the storage telemetry flow itself.

Observed in Playwright:

- `404` from `https://wiii.holilihu.online/api/v1/organizations`
- warnings from the Wiii embedded org-store:
  - multi-tenant not enabled
  - attempted switch to unknown org

This does **not** block:

- LMS admin page load
- offline storage telemetry API
- analytics rendering

But it is still noisy in the console and should be handled in a separate Wiii/embed cleanup pass.

## Decision

- No full clean burn was needed
- The VM reset + controlled sequential deploy was sufficient
- Offline storage telemetry normalization is now production-live
- Student storage flow is functioning correctly in browser smoke
- Remaining console noise is currently isolated to the Wiii embed on the admin page
