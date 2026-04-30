# R2 Storage Runbook

**Scope**: Operational playbook for the LMS Maritime Cloudflare R2 setup decided in [ADR-007](../../backend/docs/adr/ADR-007-storage-r2-mandatory-prod.md).

**Audience**: Anyone deploying or troubleshooting production storage.

---

## 1. Account & buckets

| Item | Value |
|---|---|
| Cloudflare account | `Hungkhp888@gmail.com's Account` |
| Account ID | `a7cec31eaddd4eb5858167c4aa7d0bca` |
| Zone | `holilihu.online` (id `ff5dd4a60954f136d64b185cab41d26e`) |

| Bucket | Visibility | Custom domain | Purpose |
|---|---|---|---|
| `lms-cdn` | Public via CF proxy | `cdn.holilihu.online` (TLS 1.2 min) | Thumbnails, avatars, editor images, submission docs |
| `lms-storage` | Private (presigned URLs) | (none yet — `media.holilihu.online` reserved) | Raw videos + adaptive DASH/HLS segments |

CORS allows `https://holilihu.online`, `https://www.holilihu.online`, `http://localhost:4200`, `http://localhost:8088` for both buckets.

S3 endpoint: `https://a7cec31eaddd4eb5858167c4aa7d0bca.r2.cloudflarestorage.com`

## 2. Production env required

```bash
CLOUDFLARE_R2_ENABLED=true
CLOUDFLARE_R2_ACCOUNT_ID=a7cec31eaddd4eb5858167c4aa7d0bca
CLOUDFLARE_R2_ACCESS_KEY=<token id>
CLOUDFLARE_R2_SECRET_KEY=<sha256 hex of token value>
CLOUDFLARE_R2_BUCKET=lms-cdn
CLOUDFLARE_R2_VIDEO_BUCKET=lms-storage
CLOUDFLARE_R2_PUBLIC_URL=https://cdn.holilihu.online
```

`deploy.sh` blocks the deploy if any of these are missing or `CLOUDFLARE_R2_ENABLED != true`. `LocalStorageService` activates only when `cloudflare.r2.enabled=false` is set explicitly (no `matchIfMissing` fallback) — a missing env on prod fails-fast at backend boot.

## 3. Generate / rotate API tokens

### Via the dashboard (UI)

1. R2 → Manage R2 API Tokens → **Create API token**.
2. Permissions: **Object Read & Write**, scope to `lms-cdn` + `lms-storage`.
3. TTL: 90 days recommended.
4. Copy `Access Key ID` and `Secret Access Key` (last chance).

### Programmatically (Cloudflare MCP / API)

```js
// Cloudflare API token POST /user/tokens with R2 bucket-scoped permission groups.
// Access Key ID = token id; Secret Access Key = sha256(token value).
// See backend/docs/adr/ADR-007 for the canonical script.
```

### Rotate

1. Generate new token (above).
2. SSH the VM, edit `.env.prod`:
   ```bash
   sed -i.bak \
     -e "s/^CLOUDFLARE_R2_ACCESS_KEY=.*/CLOUDFLARE_R2_ACCESS_KEY=<new id>/" \
     -e "s/^CLOUDFLARE_R2_SECRET_KEY=.*/CLOUDFLARE_R2_SECRET_KEY=<new secret>/" \
     .env.prod
   ```
3. Recreate backend: `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate backend`.
4. Verify upload works (smoke test below).
5. Revoke the old token in dashboard.

## 4. Smoke test

```bash
# 1. Health
curl -fsS https://holilihu.online/actuator/health
# {"status":"UP"}

# 2. Backend log line proves R2 is the active store
gcloud compute ssh lms-production --zone=asia-southeast1-c \
  --ssh-key-file=~/.ssh/google_compute_engine \
  --command='docker logs lms-backend-1 2>&1 | grep -E "VideoPipeline|R2 Storage" | tail -5'
# Expect: [VideoPipeline] Production video stack ready: R2 private storage + Shaka Packager.

# 3. Read a known-good public CDN object
curl -fsSI https://cdn.holilihu.online/avatars/ffb88677-a8f1-4e08-9a7f-32ba798b71a3.png
# 200 OK
```

## 5. Backfill disk → R2

When migrating files left on the legacy `lms-uploads` Docker volume up to R2:

```bash
# Replace <ACCOUNT_ID> + <ACCESS> + <SECRET> from .env.prod
docker run --rm \
  -v lms-uploads:/data:ro \
  -e AWS_ACCESS_KEY_ID="<ACCESS>" \
  -e AWS_SECRET_ACCESS_KEY="<SECRET>" \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli:latest \
  s3 sync /data/<folder> s3://lms-cdn/<folder> \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Folders that belong in `lms-cdn`: `course-thumbnails`, `avatars`, `editor-images`, `question-images`, `sections`, `general-uploads`, `previews`.

Folders that belong in `lms-storage`: `videos`, `video-renditions`, `video-packages`.

After upload, rewrite the legacy URLs in DB:

```sql
UPDATE file_attachments      SET storage_path  = REPLACE(storage_path,  'https://holilihu.online/uploads/', 'https://cdn.holilihu.online/') WHERE storage_path  LIKE 'https://holilihu.online/uploads/%' AND file_category != 'VIDEO';
UPDATE courses               SET thumbnail_url = REPLACE(thumbnail_url, 'https://holilihu.online/uploads/', 'https://cdn.holilihu.online/') WHERE thumbnail_url LIKE 'https://holilihu.online/uploads/%';
UPDATE users                 SET avatar_url    = REPLACE(avatar_url,    'https://holilihu.online/uploads/', 'https://cdn.holilihu.online/') WHERE avatar_url    LIKE 'https://holilihu.online/uploads/%';
UPDATE assignment_submissions SET file_url      = REPLACE(file_url,      'https://holilihu.online/uploads/', 'https://cdn.holilihu.online/') WHERE file_url      LIKE 'https://holilihu.online/uploads/%';
```

## 6. Common incidents

### a) Broken thumbnail (`403 Forbidden` on `holilihu.online/uploads/...`)

Almost always means the file was deleted by the orphan-cleanup scheduler before the link FK was set (the bug Phase 1 + Phase 2 fixed). Now should not recur. If it does:

- Check `file_attachments` row exists for that URL.
- Check the consumer entity (`courses.thumbnail_attachment_id` etc.) has the FK populated.
- If FK NULL on a fresh upload → application bug, escalate.
- If file legitimately gone → set the consumer column to NULL so FE shows placeholder; ask user to re-upload.

### b) `CLOUDFLARE_R2_ENABLED=true but credentials missing` on deploy

`deploy.sh` aborts. Fix `.env.prod`. See Section 3 (rotate).

### c) `no storage service configured` at backend boot

Either `cloudflare.r2.enabled` not set or both `R2Config` + `LocalStorageService` failed to activate. Check env, then logs:

```bash
docker logs lms-backend-1 2>&1 | grep -iE "storage|r2 |configured" | tail -20
```

### d) Cleanup scheduler still ran and deleted something unexpectedly

Read the audit log lines printed before each delete (Phase 1 hardening) — they list every candidate file with `id`, `file_url`, `category`, `uploadedBy`. Restore from the daily backup or re-upload.

## 7. Disaster recovery — restore from backup

R2 versioning is currently **off** (consider enabling for `lms-cdn` for object recovery). Until then:

- Daily snapshot the `lms-uploads` Docker volume during the transition window (already not authoritative for new uploads, but holds anything not yet migrated).
- Quarterly snapshot `lms-cdn` + `lms-storage` to a GCS bucket via `rclone`.

Restore:

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$KEY \
  -e AWS_SECRET_ACCESS_KEY=$SECRET \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli:latest \
  s3 sync gs://lms-r2-backup/<date>/lms-cdn s3://lms-cdn \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

## 8. References

- ADR-007: storage R2 mandatory for production
- PR #306: Phase 1 hot-fix (orphan link wiring + cleanup hardening)
- PR #307: Phase 2 schema FK + referential cleanup
- Cloudflare R2 docs: <https://developers.cloudflare.com/r2/>
- AWS S3 SDK best practices (R2 is S3-compatible): <https://docs.awspring.io/spring-cloud-aws/>
