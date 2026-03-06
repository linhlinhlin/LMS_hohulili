# Maritime LMS Onboarding

Use this guide to get a working local environment quickly without guessing which document is authoritative.

## Runtime Baseline

- Frontend dev URL: `http://localhost:4200`
- Backend dev URL on host: `http://localhost:8088`
- Spring Boot internal/container port: `8080`
- Production API: same-origin `/api/*` behind `https://holilihu.online`

Use `8088` from the host machine. Use `8080` only for container and reverse-proxy wiring.

## Prerequisites

| Tool | Recommended |
|------|-------------|
| Docker Desktop | Current stable |
| Node.js | 22.x |
| Java | 21 |
| Git | Current stable |

Maven on the host is optional because the backend can run through Docker and includes `mvnw`.

## Recommended Local Setup

### 1. Start the backend stack

```bash
cd backend
docker compose up -d
```

Verify:

```bash
curl -s http://localhost:8088/actuator/health
curl -s http://localhost:8088/api/v3/courses
```

### 2. Start the frontend

```bash
cd fe
npm install
npm start
```

Open `http://localhost:4200`.

The frontend should use `fe/proxy.conf.json` for `/api/*` in development. Do not hardcode the backend host into frontend code for local development.

## Alternative: Run Backend on the Host

```bash
cd backend
SERVER_PORT=8088 ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

This keeps the same host-facing URL as the Docker-based setup.

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@maritime.edu` | `admin123` |
| ORG_ADMIN | `orgadmin@maritime.edu` | `orgadmin123` |
| TEACHER | `teacher@maritime.edu` | `teacher123` |
| STUDENT | `student@maritime.edu` | `student123` |

For broader seeded data and manual verification flows, use [docs/testing/TEST_CHECKLIST.md](docs/testing/TEST_CHECKLIST.md).

## First Files To Read

- [README.md](README.md): repository overview and current quick start
- [backend/README.md](backend/README.md): backend runbook, API notes, and backend workflows
- [fe/FRONTEND_ARCHITECTURE.md](fe/FRONTEND_ARCHITECTURE.md): frontend structure and feature organization
- [docs/README.md](docs/README.md): documentation map and folder semantics

## Common Development Tasks

### Backend

```bash
cd backend
./mvnw test -B
docker compose logs api --tail=100
```

### Frontend

```bash
cd fe
npm run build
npm test
```

## Troubleshooting

### Backend does not start

```bash
cd backend
docker compose ps
docker compose logs api --tail=100
```

Typical causes:

- port `8088` already in use on the host
- missing environment variables for optional integrations
- Flyway or database startup failure

### Frontend cannot reach the API

Check:

- backend health at `http://localhost:8088/actuator/health`
- dev proxy config in `fe/proxy.conf.json`
- that frontend API calls still use same-origin `/api/*` in dev

### Need deeper context

Use the source-specific documents instead of extending this file:

- architecture details in `docs/architecture/`
- verification flows in `docs/testing/`
- design history in `docs/plans/`
- investigation outputs in `docs/reports/`
