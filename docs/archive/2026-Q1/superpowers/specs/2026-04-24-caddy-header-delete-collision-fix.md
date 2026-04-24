# 2026-04-24 - Caddy Header Delete/Set Collision Fix

## Problem

Production responses still missed `Content-Security-Policy`, `X-Frame-Options`,
`X-Content-Type-Options`, `Cross-Origin-Opener-Policy`, `Referrer-Policy`, and
`Permissions-Policy` even after PR #98 moved security headers into deferred
`header` handlers inside each proxied `handle`.

This kept avatar blob previews fragile and left the edge response policy only
partially applied.

## Evidence

- Runtime `/etc/caddy/Caddyfile` inside the production `caddy` container matched
  the deferred-header config from PR #98.
- Caddy admin JSON showed `headers.response.set` for all expected fields.
- Live responses from both public origin and `--resolve holilihu.online:443:127.0.0.1`
  still exposed only `Strict-Transport-Security`, while the other custom
  security headers were absent.
- A minimal local repro isolated the pattern: fields listed as both
  `-Header-Name` and `>Header-Name` in the same `header` block disappear from the
  final proxied response, while fields that are only deferred-set still appear.

## Root Cause

The Caddy snippet combined delete and deferred-set for the same response headers
in one `header` handler:

- `-Content-Security-Policy`
- `>Content-Security-Policy ...`

In practice, the delete operation won the collision for those fields, so the
final response omitted them entirely. `Strict-Transport-Security` continued to
appear because it was never deleted in that block.

## Fix

- Remove delete operations for headers that are already canonicalized via
  deferred `>` set.
- Keep `X-XSS-Protection` stripping as a separate `header -X-XSS-Protection`
  directive, because we want it removed rather than replaced.

## Why This Is Safer

- Deferred `>` set already overwrites upstream values after proxy response
  headers exist, so separate delete operations are unnecessary for the headers
  we own.
- The patch is smaller than the prior experiments and aligns with the behavior
  proven in the isolated Caddy repro.

## Verification Plan

1. Validate Caddyfile syntax with `caddy validate`.
2. Reproduce the header block locally against a proxied upstream.
3. After deploy, confirm both:
   - `curl -I https://holilihu.online/teacher/profile`
   - `curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/teacher/profile`
4. Confirm `Content-Security-Policy` now includes `img-src 'self' data: blob: https:`
   and that avatar preview works again on shared profile routes.
