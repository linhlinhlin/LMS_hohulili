#!/bin/sh
set -e

# Start Node.js SSR server in background.
# NG_ALLOWED_HOSTS: Angular 20 SSRF protection; allow production domain plus local hosts.
PORT=4000 NG_ALLOWED_HOSTS="${NG_ALLOWED_HOSTS:-holilihu.online,localhost}" node /app/server/server.mjs &

# Keep nginx in the foreground so the container stays alive.
nginx -g 'daemon off;'
