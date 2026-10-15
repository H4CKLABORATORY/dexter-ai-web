#!/bin/sh
set -eu
if [ -z "${NEXUS_PASSWORD:-}" ]; then
 echo "ERROR: NEXUS_PASSWORD must be set. Service will not start without authentication." >&2
 exit 1
fi
if [ "${#NEXUS_PASSWORD}" -lt 16 ]; then
 echo "ERROR: NEXUS_PASSWORD must be at least 16 characters." >&2
 exit 1
fi
if [ -z "${PORT:-}" ]; then export PORT=10000; fi
if [ "$PORT" != "10000" ]; then echo "INFO: container listens on port 10000; platform PORT=$PORT"; fi
htpasswd -bc /etc/nginx/.nexuspasswd nexus "$NEXUS_PASSWORD" >/dev/null
unset NEXUS_PASSWORD
mkdir -p /home/nexus/chrome-profile
chown -R nexus:nexus /home/nexus
rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 1366x768x24 -nolisten tcp -ac &
sleep 2
runuser -u nexus -- env DISPLAY=:99 HOME=/home/nexus fluxbox >/tmp/fluxbox.log 2>&1 &
runuser -u nexus -- env DISPLAY=:99 HOME=/home/nexus chromium \
 --no-sandbox \
 --disable-dev-shm-usage \
 --no-first-run \
 --no-default-browser-check \
 --disable-background-networking \
 --user-data-dir=/home/nexus/chrome-profile \
 --window-size=1320,700 \
 'https://chatgpt.com/' >/tmp/chromium.log 2>&1 &
x11vnc -display :99 -rfbport 5900 -localhost -nopw -shared -forever -quiet >/tmp/x11vnc.log 2>&1 &
websockify 127.0.0.1:6080 127.0.0.1:5900 >/tmp/websockify.log 2>&1 &
exec nginx -g 'daemon off;'
