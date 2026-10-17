#!/bin/sh
set -eu
# DENY startup unless protected. No default/fallback credentials.
: "${NEXUS_PASSWORD:?Configure a strong NEXUS_PASSWORD as a private Render environment variable}"
if [ "${#NEXUS_PASSWORD}" -lt 20 ]; then
  echo "NEXUS_PASSWORD must have 20 characters or more. Refusing startup." >&2
  exit 1
fi
mkdir -p /workspace /home/nexus/.config/opencode
chown -R nexus:nexus /workspace /home/nexus
# Hash password using bcrypt. Never print it into logs.
printf '%s\n' "$NEXUS_PASSWORD" | htpasswd -icB /etc/nginx/.nexuspasswd nexus >/dev/null
chmod 600 /etc/nginx/.nexuspasswd
# ttyd runs only on loopback; nginx provides authenticated public TLS endpoint.
runuser -u nexus -- env HOME=/home/nexus ttyd \
  --interface 127.0.0.1 --port 7681 --writable --base-path /shell \
  /usr/bin/pwsh -NoLogo -NoExit -Command 'Set-Location /workspace' &
TTYD_PID=$!
# Defense in depth: OpenCode itself also demands the same Basic credentials.
# Its service stays bound to localhost, unreachable directly from the Internet.
runuser -u nexus -- env HOME=/home/nexus \
  OPENCODE_SERVER_USERNAME=nexus OPENCODE_SERVER_PASSWORD="$NEXUS_PASSWORD" \
  opencode web --hostname 127.0.0.1 --port 4096 &
OPENCODE_PID=$!
unset NEXUS_PASSWORD
trap 'kill "$TTYD_PID" "$OPENCODE_PID" 2>/dev/null || true' TERM INT EXIT
nginx -g 'daemon off;' &
NGINX_PID=$!
wait "$NGINX_PID"
