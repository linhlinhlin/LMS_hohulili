# Documentation Guide

This folder contains two kinds of documents:

- Source-of-truth docs for current runtime and operating conventions.
- Historical design notes, plans, and research snapshots.

Use them differently.

## Read First

- `../README.md`: product overview and current quick start.
- `../ONBOARDING.md`: setup flow for new contributors.
- `../backend/README.md`: backend-focused runbook and API notes.
- `deployment/GITHUB_ACTIONS_DEPLOY.md`: GitHub Actions deployment runbook.
- `architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md`: recommended boundary between course-owned lessons and class-owned delivery overlays.
- `reports/2026-03-07-authoring-and-runtime-status.md`: current implementation snapshot for runtime hardening and teacher authoring.
- `research/2026-03-09-authoring-frontend-design-audit.md`: current frontend design direction for teacher authoring routes.
- `PWA_OFFLINE_RESEARCH.md`: deep offline architecture context.

## Current Runtime Conventions

These conventions are the baseline for this repository as of 2026-03-07.

- Frontend dev app: `http://localhost:4200`
- Backend dev API on host: `http://localhost:8088`
- Backend service port inside containers: `8080`
- Production API origin: same-origin under `https://holilihu.online/api/*`
- Wiii production origin: `https://wiii.holilihu.online`
- Root `docker-compose.yml` plus `docker-compose.dev.yml` / `docker-compose.prod.yml` are the only supported runtime topology
- pgAdmin is opt-in via the Compose `devtools` profile

Why both `8088` and `8080` exist:

- `8080` is the internal Spring Boot/container port.
- `8088` is the external dev host port exposed by Docker and expected by local tooling.
- Frontend dev should call `/api/*` through Angular proxy rather than hardcoding the backend host.

## Folder Meaning

- `architecture/`: current deep-dive architecture references and subsystem briefs.
- `deployment/`: deploy runbooks and environment setup notes.
- `plans/`: working design/change plans. See `plans/README.md` for how to interpret them.
- `research/`: supporting research and architecture comparisons.
- `reports/`: investigation outputs and audit artifacts.
- `testing/`: manual QA guides and verification checklists.

If a plan conflicts with runtime behavior, trust code plus the root runbooks first, then update the plan if needed.
