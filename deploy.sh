#!/bin/bash
# =============================================================================
# LMS Maritime - Production Deploy Script
# Deploy the currently checked-out revision with Docker Compose + Caddy.
# =============================================================================

set -euo pipefail

COMPOSE_ARGS=(--env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml)

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
