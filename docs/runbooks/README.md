# Runbooks

Runbooks are operational documents for real execution and incident response.

Read this folder when the team needs to:

- run deploy and smoke checklists
- validate production-like user flows
- recover PWA or offline storage problems
- roll out media, payment, or auth changes safely

## Current runbooks

- `PRODUCTION_PAUSE_RESUME_RUNBOOK.md` — stop/start the GCP VM between milestones; covers `pg_dump`, deploy-gate variable, cost impact
- `BRANCH_HYGIENE_RUNBOOK.md` — quarterly prune procedure for local + remote stale branches, tag-before-delete pattern, reflog recovery
- `GOOGLE_LOGIN_GIS_SETUP_RUNBOOK.md`
- `PRODUCTION_SMOKE_TEST.md`
- `DEDICATED_VIDEO_WORKER_RUNBOOK.md`
- `CLOUDFLARE_R2_VIDEO_SETUP.md`
- `CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md`
- `VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`
- `PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
- `PWA_OFFLINE_RUNBOOK.md`
- `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`
- `PUBLICATION_REFRESH_RUNBOOK.md`
- `SYNC_CONFLICT_RUNBOOK.md`
- `PAYMENT_PAYOUT_RUNBOOK.md`
- `LEARNER_FLOW_RUNBOOK.md`

## Suggested reading order

If the team is rolling out Google login:

1. `GOOGLE_LOGIN_GIS_SETUP_RUNBOOK.md`
2. `PRODUCTION_SMOKE_TEST.md`

If the team is working on publication, PWA, or offline:

1. `PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
2. `PWA_OFFLINE_RUNBOOK.md`
3. `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`
4. `PUBLICATION_REFRESH_RUNBOOK.md`
5. `SYNC_CONFLICT_RUNBOOK.md`

If the team is doing general production validation:

1. `PRODUCTION_SMOKE_TEST.md`
2. the runbook for the specific surface being changed

If the team is rolling out or debugging production video:

1. `CLOUDFLARE_R2_VIDEO_SETUP.md`
2. `VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`
3. `DEDICATED_VIDEO_WORKER_RUNBOOK.md` when ingest is separated from the app VM
4. `CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md` when scaling playback concurrency
5. `PRODUCTION_SMOKE_TEST.md`
6. `PUBLICATION_REFRESH_RUNBOOK.md` when new media is attached to an already approved course
