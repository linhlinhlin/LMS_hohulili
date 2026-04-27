# Production Pause / Resume Runbook

**Scope**: How to pause and later resume the `holilihu.online` production stack on GCP while preserving data, IP, and TLS state.

**When to use**: Between development milestones (e.g. end-of-phase checkpoints), when no real users are on the site, to conserve GCP free-trial credits.

**Cost impact**: Running ≈ $53/month → paused ≈ $7/month (disk + unattached static IP).

---

## 1. Pause production

### 1.1 Backup the database

```bash
# Run pg_dump inside the db container on the VM
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod \
      exec -T db pg_dump -U lms -d lms \
      --format=custom --no-owner --no-privileges --compress=9 \
      -f /tmp/prod-backup.dump"

# Copy dump from container → VM host
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && \
    CID=\$(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod ps -q db) && \
    docker cp \$CID:/tmp/prod-backup.dump /tmp/prod-backup.dump"

# Pull to local machine
gcloud compute scp --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  lms-production:/tmp/prod-backup.dump \
  "./backups/prod-$(date +%Y-%m-%d).dump"

# Clean up VM
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="rm -f /tmp/prod-backup.dump && \
    cd /home/Admin/LMS_hohulili && \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod \
      exec -T db rm -f /tmp/prod-backup.dump"
```

Format is custom (`pg_restore`-compatible), already gzip-compressed inside.

### 1.2 Gate the deploy workflow

The CI `build-backend` and `build-frontend` jobs run on GitHub runners and are unaffected by VM state. The `deploy` job SSHes into the VM — if the VM is stopped it would fail on every push to `main`.

Prevent red ✗ noise by flipping a repository variable:

```bash
gh variable set DEPLOY_ENABLED --body false
```

The gate is defined in `.github/workflows/deploy.yml`:

```yaml
deploy:
  if: vars.DEPLOY_ENABLED == 'true' && github.event.inputs.skip_deploy != 'true'
```

Build images still get pushed to GHCR on every `main` push, ready for the next deploy.

### 1.3 Stop the VM

```bash
gcloud compute instances stop lms-production --zone=asia-southeast1-c
gcloud compute instances list --format="table(name,zone.basename(),status)"
# Expected: STATUS = TERMINATED
```

The 30 GB `pd-balanced` disk and the static IP (`35.187.245.201`) remain reserved. Caddy's Let's Encrypt certificate survives on disk, so resumption needs no new certificate request.

---

## 2. Resume production

### 2.1 Start the VM

```bash
gcloud compute instances start lms-production --zone=asia-southeast1-c
gcloud compute instances list --format="table(name,zone.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)"
# Expected: STATUS = RUNNING, natIP = 35.187.245.201
```

### 2.2 Open the deploy gate

```bash
gh variable set DEPLOY_ENABLED --body true
```

### 2.3 Trigger a deploy

```bash
git commit --allow-empty -m "chore: resume production deploy"
git push origin main
```

Alternative (no commit):

```bash
gh workflow run "Build & Deploy" --ref main
```

Watch the run:

```bash
gh run watch
# or
gh run list --workflow=deploy.yml --limit=1
```

### 2.4 Verify

```bash
curl -fsSI https://holilihu.online
curl -fsS https://holilihu.online/api/v3/actuator/health
```

Expected: `200 OK`, `{"status":"UP"}`.

---

## 3. Restore database from backup (optional)

Only do this if the running database needs to be replaced with a backup — e.g. corruption, rollback, or moving to a fresh VM.

```bash
# Copy dump up to VM
gcloud compute scp --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  ./backups/prod-YYYY-MM-DD.dump \
  lms-production:/tmp/prod-backup.dump

# Copy from VM host into db container
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && \
    CID=\$(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod ps -q db) && \
    docker cp /tmp/prod-backup.dump \$CID:/tmp/prod-backup.dump"

# Restore (drops existing objects first)
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod \
      exec -T db pg_restore -U lms -d lms \
        --clean --if-exists --no-owner --no-privileges \
        /tmp/prod-backup.dump"
```

Restart the backend to pick up any structural changes:

```bash
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command="cd /home/Admin/LMS_hohulili && \
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend"
```

---

## 4. Cost reference

| Resource | Running | Paused |
|---|---|---|
| `e2-standard-2` compute (24/7) | ~$49/mo | $0 |
| 30 GB `pd-balanced` disk | ~$3.60/mo | ~$3.60/mo |
| Static IP `35.187.245.201` | $0 (attached to running) | ~$3.60/mo (unattached) |
| **Total** | **~$53/mo** | **~$7/mo** |

Three months of pause ≈ $21 — comfortably inside the $300 Google Cloud free trial.

---

## 5. Checkpoint log

| Date | Action | Actor | Notes |
|---|---|---|---|
| 2026-04-24 | First pause at end of faculty-level milestone. Backup: `backups/prod-2026-04-24.dump` (483 KB). | S135 | Video upload SOTA (`1c73a74a`) + deploy gate (`f3b0e318`) shipped just before pause. |
| 2026-04-27 | Resume sau Multi-Org Track Phase 1+4 ship (10 PRs, commit `8c6a804e`). **Migrated zone -b → -c** do `ZONE_RESOURCE_POOL_EXHAUSTED` 30+ phút retry không pass. Snapshot disk → tạo disk + VM mới ở -c → reattach static IP `35.187.245.201`. Updated `DEPLOY_KNOWN_HOSTS` secret (host keys regen on first boot of new VM). | S136 | Báo cáo TTTN VIMARU 28/04. Latest deploy `8c6a804e` (Phase 4 PR 4 cross-org revenue dashboard). All 6 containers healthy, 8GB RAM (e2-standard-2). |
