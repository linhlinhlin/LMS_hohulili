# 2026-04-24 - Edge Security Headers and Deploy Env Parsing Fix

## Problem

Production still had two operational gaps after the avatar CSP hotfix:

1. `deploy.sh` could not run against the real `.env.prod` on the VM because it sourced the file as shell syntax.
2. Proxied frontend/API responses did not reliably expose the expected security headers, even though the runtime Caddy config showed the intended policy.

## Evidence

- `bash ./deploy.sh` failed on the VM while parsing `.env.prod`.
- `curl -I https://holilihu.online/teacher/profile` returned no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, or `Referrer-Policy`.
- `docker compose ... exec -T caddy cat /etc/caddy/Caddyfile` and the Caddy admin JSON both showed the intended security policy was loaded.

## Root Cause

### Deploy script

`.env.prod` is consumed as a Docker env-file, not a shell script. Sourcing it with:

```bash
set -a
. ./.env.prod
set +a
```

creates a hard dependency on shell-compatible syntax that production does not guarantee.

### Caddy response headers

The previous top-level `header { ... }` block was loaded, but its deferred response mutation did not reliably surface on proxied responses in the current runtime path. Setting the policy directly through `reverse_proxy header_down` is more deterministic for this stack because the header mutation happens at the exact point Caddy copies upstream response headers.

## Fix

- Replace `. ./.env.prod` with a small parser that reads Docker env-file values directly from `.env.prod`.
- Reuse parsed values for deploy validations and database backup commands.
- Move edge security headers into a reusable Caddy snippet imported inside each `reverse_proxy` block.
- Upgrade the deploy smoke check to inspect the real HTTPS origin response using `--resolve holilihu.online:443:127.0.0.1`.

## Verification

- `bash -n deploy.sh`
- `caddy validate --config /etc/caddy/Caddyfile`
- Production smoke after deploy:
  - `curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/teacher/profile`
  - `curl -I https://holilihu.online/teacher/profile`
