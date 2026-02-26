#!/bin/bash
# =============================================================================
# LMS Maritime - Production Deploy Script
# One-command deployment to GCP Compute Engine with Docker Compose + Caddy
#
# Usage: ./deploy.sh
#
# Prerequisites:
#   - Docker & Docker Compose installed
#   - .env.prod file configured (copy from .env.prod.example)
#   - DNS: holilihu.online A record pointing to this server's IP
#
# === GCP VM Setup Guide ===
#
# 1. Create VM:
#    gcloud compute instances create lms-maritime \
#      --zone=asia-southeast1-b \
#      --machine-type=e2-medium \
#      --image-family=ubuntu-2404-lts-amd64 \
#      --image-project=ubuntu-os-cloud \
#      --boot-disk-size=50GB \
#      --boot-disk-type=pd-balanced \
#      --tags=http-server,https-server
#
# 2. Firewall rules (if not already created):
#    gcloud compute firewall-rules create allow-http \
#      --allow tcp:80 --target-tags http-server
#    gcloud compute firewall-rules create allow-https \
#      --allow tcp:443 --target-tags https-server
#
# 3. Get external IP:
#    gcloud compute instances describe lms-maritime \
#      --zone=asia-southeast1-b \
#      --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
#
# 4. DNS: Point holilihu.online A record → external IP
#
# 5. SSH into VM:
#    gcloud compute ssh lms-maritime --zone=asia-southeast1-b
#
# 6. Install Docker:
#    curl -fsSL https://get.docker.com | sh
#    sudo usermod -aG docker $USER
#    newgrp docker
#
# 7. Clone and deploy:
#    git clone <repo-url> lms && cd lms
#    cp .env.prod.example .env.prod
#    nano .env.prod  # Fill real values
#    chmod +x deploy.sh
#    ./deploy.sh
#
# =============================================================================
set -euo pipefail

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
ENV_FILE="--env-file .env.prod"

echo "=== LMS Maritime Production Deploy ==="
echo ""

# 1. Validate .env.prod exists
if [ ! -f .env.prod ]; then
  echo "ERROR: .env.prod not found."
  echo "  cp .env.prod.example .env.prod"
  echo "  nano .env.prod  # Fill real values"
  exit 1
fi

# 2. Validate required vars are set
source .env.prod
if [ "${POSTGRES_PASSWORD:-}" = "CHANGE_ME_STRONG_PASSWORD" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD not set in .env.prod"
  exit 1
fi
if [ "${JWT_SECRET:-}" = "CHANGE_ME_256_BIT_SECRET" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "ERROR: JWT_SECRET not set in .env.prod"
  exit 1
fi

echo "[1/4] Pulling latest code..."
git pull origin main 2>/dev/null || echo "  (skipped git pull — not a git repo or no remote)"

echo "[2/4] Building and starting containers..."
docker compose $COMPOSE_FILES $ENV_FILE up -d --build

echo "[3/4] Waiting for services to start..."
sleep 30

echo "[4/4] Health check..."
echo ""
docker compose $COMPOSE_FILES $ENV_FILE ps
echo ""

# Check backend health (via Caddy reverse proxy — backend port not exposed to host)
if curl -sf http://localhost/actuator/health > /dev/null 2>&1; then
  echo "Backend: HEALTHY"
elif curl -sf http://localhost:80/actuator/health > /dev/null 2>&1; then
  echo "Backend: HEALTHY"
else
  echo "Backend: Starting (check logs: docker compose $COMPOSE_FILES logs backend --tail=50)"
fi

# Check Caddy
if curl -sf -o /dev/null http://localhost:80 2>&1; then
  echo "Caddy:   HEALTHY"
else
  echo "Caddy:   Starting (check logs: docker compose $COMPOSE_FILES logs caddy --tail=50)"
fi

echo ""
echo "=== Deploy Complete ==="
echo "Site:    https://holilihu.online"
echo "Swagger: https://holilihu.online/swagger-ui"
echo "Health:  https://holilihu.online/actuator/health"
echo ""
echo "Useful commands:"
echo "  docker compose $COMPOSE_FILES $ENV_FILE logs -f           # Follow all logs"
echo "  docker compose $COMPOSE_FILES $ENV_FILE logs backend -f   # Backend logs"
echo "  docker compose $COMPOSE_FILES $ENV_FILE ps                # Container status"
echo "  docker compose $COMPOSE_FILES $ENV_FILE down              # Stop all"
