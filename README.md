<div align="center">

# Maritime LMS

Production-first LMS for maritime training, with adaptive video, offline-first learning, payment, and role-based operations.

[Quick Start](#quick-start) | [Runtime Truth](#runtime-truth) | [Local Validation](#local-validation) | [Documentation Map](#documentation-map)

</div>

---

## Overview

Maritime LMS is a full-stack learning platform for maritime education and training. The current production baseline includes:

- course authoring with `Chapter -> Lesson -> Section`
- learner progress, quizzes, assignments, certificates, and messaging
- offline-first PWA flows backed by IndexedDB, queued sync, and stale-package detection
- private video delivery on `Cloudflare R2 + Shaka Packager`
- dedicated ingest worker on GCP
- media-domain edge auth for adaptive playback on Cloudflare Free
- payment flows with backend-truth access activation states
- multi-tier roles: `ADMIN`, `ORG_ADMIN`, `TEACHER`, `STUDENT`

## Runtime Truth

These are the most important truths to remember before changing code or docs:

- Local frontend: `http://localhost:4200`
- Local backend from host: `http://localhost:8088`
- Local backend internal container port: `8080`
- Production site: `https://holilihu.online`
- Production media domain: `https://media.holilihu.online`

### Video

- Teacher uploads use `upload/init -> upload/confirm -> /api/v3/video-assets/from-upload`
- Learner-facing adaptive playback uses private `R2 + Shaka`, not Cloudflare Stream for new internal video
- Production ingest runs on a dedicated `video-worker` VM
- Production playback uses backend-signed manifests plus media objects through `media.holilihu.online`

### Offline / PWA

- Offline downloads are **device-local**
- Offline settings are **device-local**
- Offline progress sync is additive and forward-only
- Stale offline packages are surfaced to the learner and must be refreshed when publication/content versions diverge

### Payment

- The frontend should trust backend payment/access state, not local optimistic guesses
- Available payment methods come from backend truth and admin settings
- Post-payment access states are:
  - `READY`
  - `MANUAL_ACTIVATION_REQUIRED`
  - `ACCESS_PENDING`

## Quick Start

### Prerequisites

| Tool | Recommended |
|---|---|
| Docker Desktop | Recent stable version |
| Node.js | 22.x |
| Java | 21 |
| Maven | 3.9+ |

### Option 1: Backend in Docker, frontend local

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend

cd fe
npm install
npm start
```

### Option 2: Full local stack in Docker

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --wait
```

### Default Local Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@maritime.edu` | `admin123` |
| ORG_ADMIN | `orgadmin@maritime.edu` | `orgadmin123` |
| TEACHER | `teacher@maritime.edu` | `teacher123` |
| STUDENT | `student@maritime.edu` | `student123` |

Extended seeded accounts are documented in [docs/testing/TEST_CHECKLIST.md](E:/Sach/Sua/LMS_hohulili/docs/testing/TEST_CHECKLIST.md).

## Local Validation

Use this baseline before release work, runtime refactors, or a GitHub push prep pass:

```bash
cd fe && npm run build
cd ../backend && mvn -DskipTests compile -B
cd .. && docker compose -f docker-compose.yml -f docker-compose.dev.yml config -q
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend frontend
curl -s http://localhost:8088/actuator/health
cd fe && npm run test:e2e:smoke
```

For the broader browser slice:

```bash
cd fe && npm run test:e2e:release
```

## Documentation Map

Start with these files:

| File | Purpose |
|---|---|
| [AGENTS.md](E:/Sach/Sua/LMS_hohulili/AGENTS.md) | Codex working rules and current repo truth snapshot |
| [CHANGELOG.md](E:/Sach/Sua/LMS_hohulili/CHANGELOG.md) | Notable shipped changes |
| [backend/README.md](E:/Sach/Sua/LMS_hohulili/backend/README.md) | Backend architecture, runtime, and testing |
| [fe/FRONTEND_ARCHITECTURE.md](E:/Sach/Sua/LMS_hohulili/fe/FRONTEND_ARCHITECTURE.md) | Frontend architecture and conventions |
| [docs/README.md](E:/Sach/Sua/LMS_hohulili/docs/README.md) | Documentation index |
| [docs/reference/PRODUCTION_SURFACES.md](E:/Sach/Sua/LMS_hohulili/docs/reference/PRODUCTION_SURFACES.md) | Current production topology and public surfaces |
| [docs/runbooks/DEDICATED_VIDEO_WORKER_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/DEDICATED_VIDEO_WORKER_RUNBOOK.md) | Dedicated video-worker operations |
| [docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md) | Media-domain edge-auth operations |
| [docs/testing/TEST_CHECKLIST.md](E:/Sach/Sua/LMS_hohulili/docs/testing/TEST_CHECKLIST.md) | Local validation and release checklist |
| [docs/testing/E2E_MATRIX.md](E:/Sach/Sua/LMS_hohulili/docs/testing/E2E_MATRIX.md) | Smoke-vs-release browser test matrix |

## Production Notes

- Reverse proxy in production is `Caddy`, not `nginx`
- App VM currently runs `backend + frontend + caddy + postgres`
- Dedicated ingest runs on a separate `video-worker` VM
- Media edge auth is live on Cloudflare Free through a Worker custom domain
- The canonical production surface map is in [docs/reference/PRODUCTION_SURFACES.md](E:/Sach/Sua/LMS_hohulili/docs/reference/PRODUCTION_SURFACES.md)

## Contribution Rule of Thumb

If you change runtime behavior, update:

1. code
2. the relevant runbook/reference doc
3. [CHANGELOG.md](E:/Sach/Sua/LMS_hohulili/CHANGELOG.md)
