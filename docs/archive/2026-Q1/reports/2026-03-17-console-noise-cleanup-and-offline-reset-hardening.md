# Production Report: Console Noise Cleanup + Offline Reset Hardening

> **Date**: 2026-03-17  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: PASS

## Summary

This batch addressed two concrete runtime issues that were still visible after the previous production passes:

1. noisy console output caused by Wiii iframe bootstrap on routes where the AI panel was still closed
2. weak manual reset behavior for offline storage when the default IndexedDB name was still broken after corruption

The batch is now live on production and the post-deploy Playwright audit shows clean console output on the tested LMS routes.

## What changed

### 1. Persistent storage deny is no longer logged like an app error

File:

- `fe/src/app/core/services/storage-manager.service.ts`

Behavior:

- `navigator.storage.persist()` still runs
- `GRANTED` is still logged for positive confirmation
- `DENIED` is now silent, because it is a browser decision, not an LMS runtime failure

### 2. Manual offline reset now has a deeper recovery path

File:

- `fe/src/app/core/db/lms-offline.db.ts`

Behavior:

- `resetOfflineStorage()` still tries to recreate the default DB name first
- if that same-name recreate still fails with a recoverable IndexedDB/backing-store error, the client now rotates to a fresh DB name instead of failing immediately
- only after that second path fails does the app fall back to `online-only`

### 3. Wiii iframe no longer boots while the desktop AI sidebar is closed

Files:

- `fe/src/app/features/teacher/shared/teacher-layout-simple.component.ts`
- `fe/src/app/features/admin/presentation/components/admin-layout-simple.component.ts`

Behavior:

- desktop sidebar shell still renders for layout/animation
- `app-chat-panel` is only instantiated when the AI panel is actually open
- this prevents Wiii network/bootstrap noise on routes where users have not opened the AI assistant

### 4. Admin operational routes now suppress the AI assistant entirely

File:

- `fe/src/app/features/admin/presentation/components/admin-layout-simple.component.ts`

Suppressed routes:

- `/admin/offline-storage`
- `/admin/settings`
- `/admin/logs`

Reason:

- these are operator screens where clean diagnostics matter more than ambient AI availability

## Deploy method

This was deployed as a frontend-only production batch.

Steps:

1. copy patched frontend files to `/home/Admin/LMS_hohulili` on `lms-production`
2. run:
   - `docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml build frontend`
   - `docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d frontend`
3. wait for `lms-frontend-1` to become `healthy`

## Production verification

### Infra

- `GET https://holilihu.online/actuator/health` -> `{"status":"UP"}`
- frontend container -> `healthy`
- backend container remained `healthy`

### Playwright route audit after deploy

Artifacts:

- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\route-console-audit-authenticated.json`
- `E:\Sach\Sua\LMS_hohulili\.tmp-playwright-storage-smoke\route-console-audit-authenticated-postfix.json`

Checked routes:

- `/student/storage`
- `/student/courses`
- `/teacher/dashboard`
- `/admin/offline-storage`

Results after deploy:

- student routes: no console messages from LMS runtime
- teacher dashboard: no Wiii/org-store bootstrap warnings while AI sidebar is closed
- admin offline-storage: no Wiii/org-store warnings and no AI bootstrap noise

## Residual notes

- `HEAD /icons/icon-192x192.png -> net::ERR_ABORTED` still appears in Playwright traces; this is browser/request-lifecycle noise, not an LMS runtime failure
- some Playwright traces also show `requestfailed` entries for API calls that still returned `200` in the response log; these occurred during page lifecycle shutdown and were not correlated with user-facing breakage
- the new reset fallback path was validated at code-path level and deploy/runtime smoke level; a full destructive corruption simulation on production was not executed in this batch

## Conclusion

This batch is production-live and resolves the practical console noise that was still leaking into LMS operator and teacher flows, while also making offline reset materially safer when the default IndexedDB name is still unusable.
