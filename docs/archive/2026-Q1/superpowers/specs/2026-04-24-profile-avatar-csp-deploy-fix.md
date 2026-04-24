# 2026-04-24 - Profile Avatar CSP Deploy Fix

## Problem

Editing avatar images stopped working across `student`, `teacher`, `admin`, and `org-admin` profiles in production.

The shared profile flow relies on `blob:` preview URLs during avatar crop/edit, but production was still serving an older Caddy `Content-Security-Policy` header with:

```text
img-src 'self' data: https:
```

That blocks browser rendering of `blob:` images and breaks avatar preview/cropping for every role.

## Evidence

- Production header from `https://holilihu.online/teacher/profile` omitted `blob:` in `img-src`.
- `/home/Admin/LMS_hohulili/Caddyfile` on the VM already contained the fixed CSP with `blob:`.
- The running `caddy` container still had the stale config without `blob:`.
- All role routes reuse the same frontend profile component, so the blast radius is system-wide.

## Root Cause

`deploy.sh` only recreated `backend` and `frontend` in the GHCR fast path, and rebuilt without forcing `caddy` recreation in the local-build path.

Because `Caddyfile` is bind-mounted, updating the file on disk does not reload the running `caddy` container automatically. This created config drift:

- checked-out revision on VM: correct
- running reverse proxy: stale

## Fix

- Define explicit runtime services for manual deploys: `backend`, `frontend`, `caddy`, plus `video-worker` when enabled.
- Recreate those services in both deploy modes so edge config always matches the checked-out revision.
- Add a post-deploy CSP smoke check that validates `img-src 'self' data: blob:` is actually live at the edge.

## Verification

- `bash -n deploy.sh`
- Confirmed current production mismatch before the fix:
  - external header missing `blob:`
  - host `Caddyfile` already had `blob:`
  - running container config still stale
