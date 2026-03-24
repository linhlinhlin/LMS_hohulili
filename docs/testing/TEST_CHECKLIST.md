# Test Checklist

> Last updated: 2026-03-24

Current runtime truth:

- local validation is **smoke-first**, not "run every browser flow on every change"
- video runtime = `R2 + Shaka + dedicated video-worker + media-domain edge auth`
- offline runtime = `IndexedDB/Dexie + queued sync + stale package detection + device-local settings`
- payment runtime = backend-truth access activation with gateway availability controlled by backend/admin settings

## 1. URLs and local surfaces

| Surface | URL |
|---|---|
| Frontend app | `http://localhost:4200` |
| Smoke static app | `http://127.0.0.1:4300` |
| Backend API | `http://localhost:8088/api/v3` |
| Swagger UI | `http://localhost:8088/swagger-ui` |
| Health | `http://localhost:8088/actuator/health` |
| Production | `https://holilihu.online` |

## 2. Core local accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@maritime.edu` | `admin123` |
| ORG_ADMIN | `orgadmin@maritime.edu` | `orgadmin123` |
| TEACHER | `teacher@maritime.edu` | `teacher123` |
| STUDENT | `student@maritime.edu` | `student123` |

Seed datasets from V54/V55 are still available for broader manual regression when needed.

## 3. Local green baseline

Run this before browser smoke if you need a clean local validation pass:

```bash
cd fe && npm run build
cd ../backend && mvn -DskipTests compile -B
cd .. && docker compose -f docker-compose.yml -f docker-compose.dev.yml config -q
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend frontend
curl -s http://localhost:8088/actuator/health
```

Expected result:

- frontend production build passes
- backend compile passes
- compose config validates
- backend/frontend Docker images build
- health returns `{"status":"UP"}`

If the local stack is not already running:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend frontend
```

## 4. Smoke-first E2E gate

### Local / PR mandatory smoke

```bash
cd fe && npm run test:e2e:smoke
```

Current Tier 0 set:

- `fe/e2e/pwa-recovery-smoke.spec.ts`
- `fe/e2e/student-learning-video-smoke.spec.ts`
- `fe/e2e/offline-learning-smoke.spec.ts`
- `fe/e2e/student-learning-progress-smoke.spec.ts`

### Release / nightly browser regression

```bash
cd fe && npm run test:e2e:release
```

This runs smoke plus release-tagged browser checks such as:

- payment gating + deterministic simulated checkout
- broader offline learning path
- certificate edge checks as coverage grows

See [docs/testing/E2E_MATRIX.md](E:/Sach/Sua/LMS_hohulili/docs/testing/E2E_MATRIX.md) for the tier map.

## 5. Offline-first acceptance criteria

Offline is a primary product surface. Treat these as non-negotiable:

- downloaded lesson content remains readable while offline
- offline queue accepts learning mutations instead of pretending success
- `completedSections` survive offline work and merge back online
- progress convergence is additive and forward-only
- quiz offline is allowed only when metadata explicitly allows it
- stale publication/package mismatch surfaces as stale/conflict UI, not silent failure
- retry/backoff/conflict state is distinguishable from generic "all synced"

Important product truth:

- offline downloads are **device-local**
- offline settings are **device-local**
- offline settings do **not** roam across devices or accounts

Current device-local settings:

- `defaultVideoQuality`
- `downloadOnWifiOnly`
- `autoSyncWhenOnline`
- persistent storage status

Do not write tests that assume these settings roam across browsers or devices.

## 6. Release / nightly checklist

### A. Rebuild and runtime

- [ ] `cd fe && npm run build`
- [ ] `cd backend && mvn -DskipTests compile -B`
- [ ] `docker compose -f docker-compose.yml -f docker-compose.dev.yml config -q`
- [ ] `docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend frontend`
- [ ] local stack health is `UP`

### B. Offline core learning

- [ ] download a course package
- [ ] go offline
- [ ] open downloaded lesson content
- [ ] record video progress offline
- [ ] complete sections offline
- [ ] complete a lesson offline
- [ ] if quiz metadata allows offline, complete the offline-allowed quiz path
- [ ] restore connectivity
- [ ] verify queue clears or surfaces conflict/stale state correctly

### C. Online learning baseline

- [ ] complete a lesson online
- [ ] verify completed lesson IDs update
- [ ] verify lesson progress becomes `COMPLETED`
- [ ] verify next-lesson navigation stays aligned

### D. Payment boundary checks

- [ ] free course shows free enrollment CTA
- [ ] paid course shows locked/payment CTA
- [ ] simulated checkout succeeds locally without live VNPay dependency
- [ ] learner lands in learning flow after successful unlock
- [ ] instructor-led paid course records payment without falsely showing direct access as ready
- [ ] completed payment is treated as one of three backend-truth states:
  - `READY`
  - `MANUAL_ACTIVATION_REQUIRED`
  - `ACCESS_PENDING`
- [ ] payment history/load errors never fabricate an empty "no transactions" state

Local runtime note:

- smoke/release browser tests serve the production FE build from `fe/dist`
- visible gateway choices come from backend availability, not hardcoded UI assumptions
- deterministic local unlock uses the existing dev-only `SIMULATED` checkout path where appropriate

### E. Certificate edge

- [ ] course progress reaches completion
- [ ] certificate becomes visible to learner
- [ ] verification route still works with public token

## 7. Manual runtime notes

### Video / playback

- adaptive playback is signed and served through the media domain
- dedicated ingest is isolated from the web backend
- local browser smoke should prove player boot and HLS session creation, not production-scale throughput

### PWA recovery

- `fe/e2e/pwa-recovery-smoke.spec.ts` remains Tier 0 because broken recovery makes the entire offline app unreliable
- manual fallback surfaces remain:
  - `/reset-sw`
  - `/clear-site-data`

### Payment

- live VNPay is not part of the default local smoke gate
- local/release smoke should stay on simulated checkout unless a dedicated staging gateway exists
- for `INSTRUCTOR_LED` courses, payment completion and learner activation are related but not identical concerns

## 8. Quick API probes

```bash
curl -s http://localhost:8088/actuator/health

curl -s http://localhost:8088/api/v3/courses?page=0&size=20

curl -s -X POST http://localhost:8088/api/v3/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"student@maritime.edu\",\"password\":\"student123\"}"
```

## 9. Notes for teammates

- Prefer seeded discovery helpers for payment/offline smoke instead of pinning every browser test to one learner account
- Keep stateful offline/browser specs on a single worker
- Reset browser/app origin state at the start of smoke specs
- If smoke fails after a runtime or infra change, treat it as a release blocker until explained
