# 2026-04-24 - Deploy Workflow Should Reuse Verified Production Script

## Problem

GitHub Actions `Build & Deploy` reported success for production deploys even when
the SSH deploy body did not complete successfully. This left the VM checked out
to the new revision while the running containers continued serving stale runtime
state, including old Caddy configuration.

## Production Evidence

- The merge for PR #100 reached `main` and the `Build & Deploy` workflow
  reported success.
- The VM repository advanced to `eb50b0e8`, but the running `caddy` container
  still served the previous `Caddyfile` content.
- Public and origin header checks still missed the intended edge security
  headers until a manual `bash ./deploy.sh` was run on the VM.

## CI Log Evidence

The deploy job log contained:

```text
/home/runner/work/_temp/...sh: line 1: up: command not found
```

but the job still ended as successful and published a deploy summary.

## Root Cause

The workflow duplicated deployment logic inline inside an SSH heredoc. That path
had drifted from the verified `deploy.sh` behavior and was brittle around shell
expansion and remote execution. Because the workflow used a separate deploy
implementation from the one operators actually trust in production, failures
could leave stale runtime state behind without a reliable signal.

## Fix

- Keep the remote checkout to the pushed SHA in the workflow.
- Replace the duplicated inline deploy body with a call to `bash ./deploy.sh`
  on the remote host.
- Quote the heredoc delimiter so the remote body is not subject to accidental
  local shell expansion.

## Why This Is Better

- One deploy path instead of two diverging paths.
- Manual recovery deploys and CI/CD deploys now exercise the same logic.
- If `deploy.sh` fails, SSH fails and the workflow fails instead of reporting a
  misleading success.

## Verification Plan

1. Validate the workflow file structure locally.
2. Confirm the quoted heredoc renders the remote script verbatim.
3. Merge a production-safe change and verify:
   - the VM checks out the target SHA
   - `deploy.sh` output appears in the action log
   - containers show fresh creation times
   - public/origin smoke checks reflect the deployed configuration
