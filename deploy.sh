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

read_env_value() {
  local key="$1"
  awk -v key="$key" '
    {
      line = $0
      sub(/\r$/, "", line)
      if (line ~ /^[[:space:]]*#/ || line ~ /^[[:space:]]*$/) {
        next
      }
      if (line ~ /^[[:space:]]*export[[:space:]]+/) {
        sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      }
      eq = index(line, "=")
      if (eq == 0) {
        next
      }
      current = substr(line, 1, eq - 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", current)
      if (current == key) {
        print substr(line, eq + 1)
        exit
      }
    }
  ' .env.prod
}

env_or_default() {
  local key="$1"
  local default_value="$2"
  local value
  value="$(read_env_value "$key")"
  if [ -n "$value" ]; then
    printf '%s' "$value"
  else
    printf '%s' "$default_value"
  fi
}

POSTGRES_USER_VALUE="$(env_or_default POSTGRES_USER lms)"
POSTGRES_PASSWORD_VALUE="$(read_env_value POSTGRES_PASSWORD)"
POSTGRES_DB_VALUE="$(env_or_default POSTGRES_DB lms)"
JWT_SECRET_VALUE="$(read_env_value JWT_SECRET)"
GOOGLE_AUTH_ENABLED_VALUE="$(env_or_default GOOGLE_AUTH_ENABLED false)"
GOOGLE_WEB_CLIENT_ID_VALUE="$(read_env_value GOOGLE_WEB_CLIENT_ID)"
GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED_VALUE="$(env_or_default GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED false)"
GOOGLE_CLIENT_SECRET_VALUE="$(read_env_value GOOGLE_CLIENT_SECRET)"
GOOGLE_OAUTH_REDIRECT_URI_VALUE="$(read_env_value GOOGLE_OAUTH_REDIRECT_URI)"
GOOGLE_OAUTH_FRONTEND_CALLBACK_VALUE="$(read_env_value GOOGLE_OAUTH_FRONTEND_CALLBACK)"
CLOUDFLARE_R2_ENABLED_VALUE="$(env_or_default CLOUDFLARE_R2_ENABLED false)"
CLOUDFLARE_R2_ACCOUNT_ID_VALUE="$(read_env_value CLOUDFLARE_R2_ACCOUNT_ID)"
CLOUDFLARE_R2_ACCESS_KEY_VALUE="$(read_env_value CLOUDFLARE_R2_ACCESS_KEY)"
CLOUDFLARE_R2_SECRET_KEY_VALUE="$(read_env_value CLOUDFLARE_R2_SECRET_KEY)"
CLOUDFLARE_R2_BUCKET_VALUE="$(read_env_value CLOUDFLARE_R2_BUCKET)"
CLOUDFLARE_R2_VIDEO_BUCKET_VALUE="$(read_env_value CLOUDFLARE_R2_VIDEO_BUCKET)"
CLOUDFLARE_R2_PUBLIC_URL_VALUE="$(read_env_value CLOUDFLARE_R2_PUBLIC_URL)"
WIII_WEBHOOK_ENABLED_VALUE="$(env_or_default WIII_WEBHOOK_ENABLED false)"
WIII_WEBHOOK_URL_VALUE="$(read_env_value WIII_WEBHOOK_URL)"
WIII_WEBHOOK_SECRET_VALUE="$(read_env_value WIII_WEBHOOK_SECRET)"
WIII_SERVICE_TOKEN_VALUE="$(read_env_value WIII_SERVICE_TOKEN)"
WIII_TOKEN_EXCHANGE_URL_VALUE="$(read_env_value WIII_TOKEN_EXCHANGE_URL)"
ENABLE_LOCAL_VIDEO_WORKER_VALUE="$(env_or_default ENABLE_LOCAL_VIDEO_WORKER true)"

COMPOSE_ARGS=(--env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml)
IMAGE_SERVICES=(backend frontend)
RUNTIME_SERVICES=(backend frontend caddy)
if [ "$ENABLE_LOCAL_VIDEO_WORKER_VALUE" = "true" ]; then
  COMPOSE_ARGS+=(--profile video-worker)
  IMAGE_SERVICES+=(video-worker)
  RUNTIME_SERVICES+=(video-worker)
fi

if [ "$POSTGRES_PASSWORD_VALUE" = "CHANGE_ME_STRONG_PASSWORD" ] || [ -z "$POSTGRES_PASSWORD_VALUE" ]; then
  echo "ERROR: POSTGRES_PASSWORD not set in .env.prod"
  exit 1
fi

if [ "$JWT_SECRET_VALUE" = "CHANGE_ME_256_BIT_SECRET" ] || [ -z "$JWT_SECRET_VALUE" ]; then
  echo "ERROR: JWT_SECRET not set in .env.prod"
  exit 1
fi

if [ "$WIII_WEBHOOK_ENABLED_VALUE" = "true" ]; then
  if [ -z "$WIII_WEBHOOK_URL_VALUE" ] || [ -z "$WIII_WEBHOOK_SECRET_VALUE" ] || [ -z "$WIII_SERVICE_TOKEN_VALUE" ] || [ -z "$WIII_TOKEN_EXCHANGE_URL_VALUE" ]; then
    echo "ERROR: WIII_WEBHOOK_ENABLED=true but one or more Wiii variables are missing."
    exit 1
  fi
fi

if [ "$GOOGLE_AUTH_ENABLED_VALUE" = "true" ] && [ -z "$GOOGLE_WEB_CLIENT_ID_VALUE" ]; then
  echo "ERROR: GOOGLE_AUTH_ENABLED=true but GOOGLE_WEB_CLIENT_ID is missing."
  exit 1
fi

if [ "$GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED_VALUE" = "true" ]; then
  if [ "$GOOGLE_AUTH_ENABLED_VALUE" != "true" ]; then
    echo "ERROR: GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED=true requires GOOGLE_AUTH_ENABLED=true."
    exit 1
  fi

  if [ -z "$GOOGLE_WEB_CLIENT_ID_VALUE" ] || [ -z "$GOOGLE_CLIENT_SECRET_VALUE" ] || [ -z "$GOOGLE_OAUTH_REDIRECT_URI_VALUE" ] || [ -z "$GOOGLE_OAUTH_FRONTEND_CALLBACK_VALUE" ]; then
    echo "ERROR: GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED=true but one or more Google OAuth variables are missing."
    exit 1
  fi
fi

if [ "$GOOGLE_AUTH_ENABLED_VALUE" != "true" ] && { [ -n "$GOOGLE_WEB_CLIENT_ID_VALUE" ] || [ "$GOOGLE_OAUTH_REDIRECT_FLOW_ENABLED_VALUE" = "true" ]; }; then
  echo "WARN: Google OAuth values are present but GOOGLE_AUTH_ENABLED=false."
  echo "      The frontend will show Google sign-in as unavailable and the authorize endpoint will stay disabled."
  echo ""
fi

if [ "$CLOUDFLARE_R2_ENABLED_VALUE" = "true" ]; then
  if [ -z "$CLOUDFLARE_R2_ACCOUNT_ID_VALUE" ] || [ -z "$CLOUDFLARE_R2_ACCESS_KEY_VALUE" ] || [ -z "$CLOUDFLARE_R2_SECRET_KEY_VALUE" ] || [ -z "$CLOUDFLARE_R2_BUCKET_VALUE" ] || [ -z "$CLOUDFLARE_R2_VIDEO_BUCKET_VALUE" ] || [ -z "$CLOUDFLARE_R2_PUBLIC_URL_VALUE" ]; then
    echo "ERROR: CLOUDFLARE_R2_ENABLED=true but one or more R2 variables are missing."
    exit 1
  fi
fi

if [ "$ENABLE_LOCAL_VIDEO_WORKER_VALUE" != "true" ]; then
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
    pg_dump -U "$POSTGRES_USER_VALUE" "$POSTGRES_DB_VALUE" | gzip > "$BACKUP_FILE"
  echo "  Backup saved: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  echo "  Skipped (database not running — first deploy?)"
fi

echo "[4/7] Pruning Docker cache to prevent OOM..."
docker system prune -f --volumes 2>/dev/null || true

if docker compose "${COMPOSE_ARGS[@]}" config --images 2>/dev/null | grep -q "ghcr.io"; then
  echo "[5/7] Pulling pre-built images from GHCR..."
  docker compose "${COMPOSE_ARGS[@]}" pull "${IMAGE_SERVICES[@]}"
  docker image prune -f 2>/dev/null || true
  # Recreate Caddy whenever host-mounted config such as Caddyfile changes.
  docker compose "${COMPOSE_ARGS[@]}" up -d --wait --remove-orphans --force-recreate "${RUNTIME_SERVICES[@]}"
else
  echo "[5/7] Building and starting containers (no GHCR images configured)..."
  # Keep the manual deploy path aligned with CI/CD: app containers + Caddy
  # must restart together so edge headers never drift from the checked-out
  # revision on disk.
  docker compose "${COMPOSE_ARGS[@]}" up -d --build --wait --remove-orphans --force-recreate "${RUNTIME_SERVICES[@]}"
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

CSP_HEADER="$(curl -skI --resolve holilihu.online:443:127.0.0.1 https://holilihu.online/teacher/profile | tr -d '\r' | grep -i '^Content-Security-Policy:' || true)"
if printf '%s' "$CSP_HEADER" | grep -Fq "img-src 'self' data: blob:"; then
  echo "CSP:     HEALTHY (blob: allowed for avatar previews)"
else
  echo "CSP:     WARNING (missing blob: in img-src; avatar preview/edit may fail)"
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
