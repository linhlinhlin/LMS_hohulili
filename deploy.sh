#!/bin/bash
# =============================================================================
# LMS Maritime - Production Deploy Script
# Deploy the currently checked-out revision with Docker Compose + Caddy.
# =============================================================================

set -euo pipefail

echo "=== LMS Maritime Production Deploy ==="
echo ""

if [ ! -f .env.prod ]; then
  echo "ERROR: .env.prod not found."
  echo "  cp .env.prod.example .env.prod"
  echo "  nano .env.prod  # Fill real values"
  exit 1
fi

set -a
. ./.env.prod
set +a

COMPOSE_ARGS=(--env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml)
if [ "${ENABLE_LOCAL_VIDEO_WORKER:-true}" = "true" ]; then
  COMPOSE_ARGS+=(--profile video-worker)
fi

if [ "${POSTGRES_PASSWORD:-}" = "CHANGE_ME_STRONG_PASSWORD" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD not set in .env.prod"
  exit 1
fi

if [ "${JWT_SECRET:-}" = "CHANGE_ME_256_BIT_SECRET" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "ERROR: JWT_SECRET not set in .env.prod"
  exit 1
fi

if [ "${WIII_WEBHOOK_ENABLED:-false}" = "true" ]; then
  if [ -z "${WIII_WEBHOOK_URL:-}" ] || [ -z "${WIII_WEBHOOK_SECRET:-}" ] || [ -z "${WIII_SERVICE_TOKEN:-}" ] || [ -z "${WIII_TOKEN_EXCHANGE_URL:-}" ]; then
    echo "ERROR: WIII_WEBHOOK_ENABLED=true but one or more Wiii variables are missing."
    exit 1
  fi
fi

if [ "${CLOUDFLARE_R2_ENABLED:-false}" = "true" ]; then
  if [ -z "${CLOUDFLARE_R2_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_R2_ACCESS_KEY:-}" ] || [ -z "${CLOUDFLARE_R2_SECRET_KEY:-}" ] || [ -z "${CLOUDFLARE_R2_BUCKET:-}" ] || [ -z "${CLOUDFLARE_R2_VIDEO_BUCKET:-}" ] || [ -z "${CLOUDFLARE_R2_PUBLIC_URL:-}" ]; then
    echo "ERROR: CLOUDFLARE_R2_ENABLED=true but one or more R2 variables are missing."
    exit 1
  fi
fi

if [ "${ENABLE_LOCAL_VIDEO_WORKER:-true}" != "true" ]; then
  echo "WARN: ENABLE_LOCAL_VIDEO_WORKER=false"
  echo "      Ensure a dedicated worker VM is deployed before relying on video ingest."
  echo ""
fi

echo "[1/5] Validating Docker Compose configuration..."
docker compose "${COMPOSE_ARGS[@]}" config -q

echo "[2/5] Deploying current checked-out revision..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "  revision: $(git rev-parse --short HEAD)"
else
  echo "  revision: unknown (not a git work tree)"
fi

echo "[3/5] Building and starting containers..."
docker compose "${COMPOSE_ARGS[@]}" up -d --build --wait --remove-orphans

echo "[4/5] Container status..."
echo ""
docker compose "${COMPOSE_ARGS[@]}" ps
echo ""

echo "[5/5] Edge health check..."
if curl -sf http://localhost/actuator/health > /dev/null 2>&1; then
  echo "Backend: HEALTHY"
elif curl -sf http://localhost:80/actuator/health > /dev/null 2>&1; then
  echo "Backend: HEALTHY"
else
  echo "Backend: Unhealthy (check logs: docker compose ${COMPOSE_ARGS[*]} logs backend --tail=50)"
fi

if curl -sf -o /dev/null http://localhost:80 > /dev/null 2>&1; then
  echo "Caddy:   HEALTHY"
else
  echo "Caddy:   Unhealthy (check logs: docker compose ${COMPOSE_ARGS[*]} logs caddy --tail=50)"
fi

echo ""
echo "=== Deploy Complete ==="
echo "Site:    https://holilihu.online"
echo "Swagger: https://holilihu.online/swagger-ui"
echo "Health:  https://holilihu.online/actuator/health"
echo ""
echo "Useful commands:"
echo "  docker compose ${COMPOSE_ARGS[*]} logs -f           # Follow all logs"
echo "  docker compose ${COMPOSE_ARGS[*]} logs backend -f   # Backend logs"
echo "  docker compose ${COMPOSE_ARGS[*]} ps                # Container status"
echo "  docker compose ${COMPOSE_ARGS[*]} down              # Stop all"
