#!/bin/sh
set -e

mkdir -p /var/log/modsec
mkdir -p /var/log/nginx /var/cache/nginx
# touch is best-effort: on subsequent starts the volume files are already
# nginx-owned; root without DAC_OVERRIDE cannot touch them — that's fine,
# they already exist. The || true prevents a spurious set -e failure.
touch /var/log/modsec/audit.log 2>/dev/null || true
touch /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || true
chown -R nginx:nginx /var/log/modsec /var/log/nginx /var/cache/nginx

exec /docker-entrypoint.sh nginx -g "daemon off;"
