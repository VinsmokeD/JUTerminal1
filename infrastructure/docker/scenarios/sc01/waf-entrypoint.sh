#!/bin/sh
set -e

mkdir -p /var/log/modsec
mkdir -p /var/log/nginx /var/cache/nginx
touch /var/log/modsec/audit.log
touch /var/log/nginx/access.log /var/log/nginx/error.log
chown -R nginx:nginx /var/log/modsec /var/log/nginx /var/cache/nginx

exec /docker-entrypoint.sh nginx -g "daemon off;"
