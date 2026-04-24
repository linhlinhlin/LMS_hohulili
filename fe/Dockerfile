# =============================================================================
# LMS Maritime Frontend - Multi-Stage Docker Build
# Stage 1: Build Angular, Stage 2: SSR (Node.js) + nginx for static files
# =============================================================================

# syntax=docker/dockerfile:1.4

# ----- Stage 1: Build Angular -----
FROM node:25-alpine AS build
WORKDIR /app

# Cache npm dependencies
COPY package*.json ./
COPY vendor ./vendor
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Build production bundle (ng build defaults to production; fix-ngsw.js removes phantom files)
COPY . .
RUN npx ng build --configuration=production && node scripts/fix-ngsw.js

# ----- Stage 2: Node.js SSR + nginx for static assets -----
FROM node:25-alpine

# Install nginx
RUN apk add --no-cache nginx && \
    mkdir -p /run/nginx

# Copy built Angular app (browser + server bundles)
COPY --from=build /app/dist/lms-angular/browser /app/browser
COPY --from=build /app/dist/lms-angular/server /app/server

# Angular 20 SSR outputs index.csr.html — keep as fallback for CSR
RUN cp /app/browser/index.csr.html /app/browser/index.html

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/lms.conf
RUN rm -f /etc/nginx/http.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 80

# Health check against nginx (which proxies to Node or serves static)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/health || exit 1

CMD ["/app/docker-entrypoint.sh"]
