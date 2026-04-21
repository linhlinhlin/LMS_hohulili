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

echo "[1/7] Validating Docker Compose configuration..."
docker compose "${COMPOSE_ARGS[@]}" config -q

echo "[2/7] Deploying current checked-out revision..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "  revision: $(git rev-parse --short HEAD)"
else
  echo "  revision: unknown (not a git work tree)"
fi

echo "[3/7] Backing up database..."
if docker compose "${COMPOSE_ARGS[@]}" ps db --status running -q 2>/dev/null | grep -q .; then
  BACKUP_FILE="backups/lms-pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
  mkdir -p backups
  docker compose "${COMPOSE_ARGS[@]}" exec -T db \
    pg_dump -U "${POSTGRES_USER:-lms}" "${POSTGRES_DB:-lms}" | gzip > "$BACKUP_FILE"
  echo "  Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  echo "  Skipped (database not running — first deploy?)"
fi

echo "[4/7] Pruning Docker cache to prevent OOM..."
docker system prune -f --volumes 2>/dev/null || true

if docker compose "${COMPOSE_ARGS[@]}" config --images 2>/dev/null | grep -q "ghcr.io"; then
  echo "[5/7] Pulling pre-built images from GHCR..."
  docker compose "${COMPOSE_ARGS[@]}" pull backend frontend
  docker image prune -f 2>/dev/null || true
  docker compose "${COMPOSE_ARGS[@]}" up -d --wait --remove-orphans
else
  echo "[5/7] Building and starting containers (no GHCR images configured)..."
  docker compose "${COMPOSE_ARGS[@]}" up -d --build --wait --remove-orphans
fi

echo "[6/7] Container status..."
echo ""
docker compose "${COMPOSE_ARGS[@]}" ps
echo ""

echo "[7/7] Edge health check..."
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
