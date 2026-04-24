# 2026-04-24 - Caddy Deferred Security Headers Follow-up

## Problem

`deploy.sh` is fixed, but proxied responses on production still do not emit the expected security headers after PR #96.

Observed responses for both public edge and direct origin access still miss:

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Permissions-Policy`
- `Referrer-Policy`

## Evidence

- `curl -I https://holilihu.online/teacher/profile`
- `curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/teacher/profile`
- `curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/api/v3/auth/google/config`

All of them still omit the expected headers, despite the Caddy admin JSON showing the intended policy in runtime config.

## Root Cause

Using `reverse_proxy header_down` was not sufficient for this stack/runtime path.

The official Caddy guidance is more explicit:

- use the `header` directive to manipulate HTTP response headers
- use the `>` prefix to defer overrides until after the upstream response is written

That pattern is a better fit here than relying on `header_down` response mutation alone.

## Fix

- Keep the shared `edge_response_headers` snippet.
- Convert it to a `header { ... }` block.
- Use `>` for the security headers that must override proxied responses.
- Import the snippet inside each `handle` before `reverse_proxy`.

## Verification

- `caddy validate --config /etc/caddy/Caddyfile`
- Production smoke after deploy:
  - `curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/teacher/profile`
  - `curl -I https://holilihu.online/teacher/profile`
