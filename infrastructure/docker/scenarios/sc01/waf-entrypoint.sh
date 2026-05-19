#!/bin/sh
set -e

mkdir -p /var/log/modsec
touch /var/log/modsec/audit.log
chown -R nginx:nginx /var/log/modsec

exec su -p nginx -s /bin/sh -c 'exec /docker-entrypoint.sh nginx -g "daemon off;"'
