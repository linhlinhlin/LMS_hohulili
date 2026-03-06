# GitHub Actions Deploy Runbook

This repository includes a manual deployment workflow at `.github/workflows/deploy.yml`.

It is intentionally `workflow_dispatch` only. Production deploys should be explicit, reviewable, and tied to a specific revision.

## Deployment Model

- GitHub Actions resolves the requested `ref` to an exact commit SHA.
- The workflow connects to the target server over SSH.
- The server-side repo is forced to that exact SHA.
- `git clean -fd` is executed on the deployment working copy to remove stale untracked files.
- The workflow runs `./deploy.sh`, which validates `.env.prod`, validates Compose config, and deploys with `docker compose ... up -d --build --wait --remove-orphans`.

This assumes the deployment target is a dedicated clone used only for releases.

## Recommended GitHub Environment

Create a GitHub Environment named `production` and require reviewer approval before deployment.

Store these as environment variables:

- `DEPLOY_HOST`: production server hostname or IP
- `DEPLOY_PORT`: SSH port, usually `22`
- `DEPLOY_USER`: deploy user on the server
- `DEPLOY_APP_DIR`: absolute path to the repo clone on the server
- `DEPLOY_URL`: public URL, for example `https://holilihu.online`

Store these as environment secrets:

- `DEPLOY_SSH_PRIVATE_KEY`: private key for the deploy user
- `DEPLOY_KNOWN_HOSTS`: pinned output of `ssh-keyscan -H <host>`

## Server Prerequisites

- Docker and Docker Compose plugin installed
- Repository cloned on the server
- `.env.prod` created in the repo root
- deploy user has permission to run Docker
- DNS and inbound ports for `80` and `443` already configured

## First-Time Setup

On the server:

```bash
git clone <repo-url> lms
cd lms
cp .env.prod.example .env.prod
chmod +x deploy.sh
```

Then fill `.env.prod` with production values.

## Running a Deploy

From GitHub:

1. Open `Actions`.
2. Select `Deploy`.
3. Click `Run workflow`.
4. Choose `production`.
5. Enter the branch, tag, or commit SHA to deploy.

## Why This Design

- `workflow_dispatch` avoids accidental production deploys from every push.
- Environment-scoped vars and secrets keep deploy configuration centralized.
- Exact-SHA deployment avoids "main moved while deploy was running" ambiguity.
- `git clean -fd` keeps the server checkout deterministic.
- `deploy.sh` remains the server-side source of truth for Compose-based production rollout.
