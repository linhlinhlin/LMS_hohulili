# Maritime LMS Backend

Spring Boot 3.2 + Java 21 + PostgreSQL 16 with modular Clean Architecture / DDD.

## Quick Start

### Runtime Conventions

- Host machine API URL: `http://localhost:8088`
- Internal Spring/container port: `8080`
- Production API URL: same-origin `/api/*` behind Caddy
- Supported Docker topology: root `docker-compose*.yml`

### Local Backend Run

```bash
cp ../.env.dev.example ../.env
cd ../
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend

curl -s http://localhost:8088/actuator/health
curl -s http://localhost:8088/api/v3/courses?page=0&size=1
```

### Host-Native Backend Run

```bash
cd backend
SERVER_PORT=8088 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## Core Backend Truths

### Video Runtime

- Upload path: `upload/init -> upload/confirm -> POST /api/v3/video-assets/from-upload`
- Storage split:
  - public/general assets: `lms-cdn`
  - private learner-facing media/storage: `lms-storage`
- Adaptive processing uses `ffprobe + ffmpeg + Shaka Packager`
- Production ingest runs on a dedicated `video-worker` VM
- Production playback uses backend-signed manifests plus `media.holilihu.online` for HLS/DASH media objects

### Offline Sync

- Backend must remain the canonical source of truth
- Offline progress convergence is additive and forward-only
- `completedSections` should merge by union, not last-write-wins
- Offline/package conflicts should surface as stale or conflict states, not silently overwrite valid server progress

### Payment

- Payment status and post-payment access are backend-truth driven
- Existing paid access should not be interpreted as “unpaid” just because a gateway callback view is stale
- Instructor-led courses may complete payment without direct learner access being immediately ready

## Architecture

```text
com.example.lms/
├── identity/
├── course_authoring/
├── learning_delivery/
├── assessment/
├── communication/
├── ai_assistant/
├── shared/
└── config/
```

### Layer Rule

```text
Domain <- Application <- Infrastructure
```

- Domain: pure business model, no framework annotations
- Application: use cases and DTOs, depends on ports
- Infrastructure: JPA, controllers, adapters, external integrations

### Critical JPA Rule

Never point a Spring Data repository at a domain model.

Correct:

```java
public interface CourseJpaRepository extends JpaRepository<CourseJpaEntity, UUID> {}
```

Wrong:

```java
public interface BadRepository extends JpaRepository<Course, UUID> {}
```

## Local Checks

### Compile and tests

```bash
cd backend
mvn -DskipTests compile -B
mvn test -B
```

### Docker build

```bash
cd ..
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend
```

### Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=100
```

## Common Failure Modes

### “Not a managed type”

Cause:
- a JPA repository is targeting a domain model instead of a `*JpaEntity`

Fix:
- move the repository to the JPA entity and convert through an adapter/mapper

### Production worker loses DB connectivity

Cause:
- a private PostgreSQL forwarder on the app VM is pinned to a stale Docker IP
- or the remote worker is trying to use SSL over a plain private forward

Fix:
- resolve the DB container IP dynamically in the forwarder
- use `sslmode=disable` on the worker JDBC URL unless the private hop terminates PostgreSQL SSL

### Learner cannot see new internal video on an approved course

Cause:
- learner content is served from `course_publications`, not the teacher draft

Fix:
- resubmit and approve the course after changing `videoAssetId`

## Backend Docs to Read Next

| File | Purpose |
|---|---|
| [AGENTS.md](E:/Sach/Sua/LMS_hohulili/AGENTS.md) | Repo-wide runtime truth snapshot |
| [docs/reference/PRODUCTION_SURFACES.md](E:/Sach/Sua/LMS_hohulili/docs/reference/PRODUCTION_SURFACES.md) | Production topology |
| [docs/runbooks/DEDICATED_VIDEO_WORKER_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/DEDICATED_VIDEO_WORKER_RUNBOOK.md) | Video ingest operations |
| [docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md](E:/Sach/Sua/LMS_hohulili/docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md) | Playback edge-auth operations |
| [docs/testing/TEST_CHECKLIST.md](E:/Sach/Sua/LMS_hohulili/docs/testing/TEST_CHECKLIST.md) | Local and release validation |
