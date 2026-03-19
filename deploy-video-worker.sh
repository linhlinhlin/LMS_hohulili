#!/bin/bash
# =============================================================================
# LMS Maritime - Dedicated Video Worker Deploy Script
# Deploy only the video ingest worker onto a separate VM.
# =============================================================================

set -euo pipefail

ENV_FILE="${1:-.env.video-worker}"
COMPOSE_ARGS=(--env-file "${ENV_FILE}" -f docker-compose.video-worker.yml)

echo "=== LMS Maritime Dedicated Video Worker Deploy ==="
echo ""

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  echo "  cp .env.video-worker.example .env.video-worker"
  echo "  nano .env.video-worker  # Fill real values"
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [ -z "${value}" ]; then
    echo "ERROR: ${key} is required in ${ENV_FILE}"
    exit 1
  fi
}

require_env "SPRING_DATASOURCE_URL"
require_env "SPRING_DATASOURCE_PASSWORD"

if [ "${JWT_SECRET:-}" = "CHANGE_ME_256_BIT_SECRET" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "ERROR: JWT_SECRET not set in ${ENV_FILE}"
  exit 1
fi

if [ "${CLOUDFLARE_R2_ENABLED:-false}" = "true" ]; then
  require_env "CLOUDFLARE_R2_ACCOUNT_ID"
  require_env "CLOUDFLARE_R2_ACCESS_KEY"
  require_env "CLOUDFLARE_R2_SECRET_KEY"
  require_env "CLOUDFLARE_R2_BUCKET"
  require_env "CLOUDFLARE_R2_VIDEO_BUCKET"
  require_env "CLOUDFLARE_R2_PUBLIC_URL"
fi

echo "[1/4] Validating Docker Compose configuration..."
docker compose "${COMPOSE_ARGS[@]}" config -q

echo "[2/4] Building and starting dedicated worker..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "  revision: $(git rev-parse --short HEAD)"
else
  echo "  revision: unknown (not a git work tree)"
fi
docker compose "${COMPOSE_ARGS[@]}" up -d --build --wait --remove-orphans

echo "[3/4] Container status..."
echo ""
docker compose "${COMPOSE_ARGS[@]}" ps
echo ""

echo "[4/4] Health check..."
WORKER_CONTAINER_ID="$(docker compose "${COMPOSE_ARGS[@]}" ps -q video-worker)"
if [ -z "${WORKER_CONTAINER_ID}" ]; then
  echo "Video worker: missing container"
  exit 1
fi

WORKER_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "${WORKER_CONTAINER_ID}")"
echo "Video worker: ${WORKER_HEALTH}"

if [ "${WORKER_HEALTH}" != "healthy" ]; then
  echo "Worker unhealthy. Check logs:"
  echo "  docker compose ${COMPOSE_ARGS[*]} logs video-worker --tail=100"
  exit 1
fi

echo ""
echo "=== Dedicated Worker Deploy Complete ==="
echo "Useful commands:"
echo "  docker compose ${COMPOSE_ARGS[*]} logs -f video-worker"
echo "  docker compose ${COMPOSE_ARGS[*]} ps"
echo "  docker compose ${COMPOSE_ARGS[*]} down"
