# =============================================================================
# LMS Maritime Frontend - Multi-Stage Docker Build
# Stage 1: Build Angular, Stage 2: Serve with nginx
# =============================================================================

# syntax=docker/dockerfile:1.4

# ----- Stage 1: Build Angular -----
FROM node:20-alpine AS build
WORKDIR /app

# Cache npm dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Build production bundle (ng build defaults to production; fix-ngsw.js removes phantom files)
COPY . .
RUN npx ng build --configuration=production && node scripts/fix-ngsw.js

# ----- Stage 2: Serve with nginx -----
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/lms.conf

# Copy built Angular app
COPY --from=build /app/dist/lms-angular/browser /usr/share/nginx/html

# Angular 20 SSR outputs index.csr.html — create index.html copy for nginx try_files fallback
RUN cp /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html

# Security: Proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    # Create cache directories with proper ownership
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Run as nginx user
USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
