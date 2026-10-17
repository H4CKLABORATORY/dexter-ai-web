# DEXTER NEXUS: Linux development machine with real PowerShell/OpenCode.
FROM node:22-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/home/nexus
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl wget git gnupg apt-transport-https \
  nginx apache2-utils tini build-essential cmake pkg-config \
  libjson-c-dev libwebsockets-dev libuv1-dev libssl-dev zlib1g-dev \
  && git clone --quiet --depth=1 --branch 1.7.7 https://github.com/tsl0922/ttyd.git /tmp/ttyd \
  && cmake -S /tmp/ttyd -B /tmp/ttyd/build -DCMAKE_BUILD_TYPE=Release \
  && cmake --build /tmp/ttyd/build -j 2 \
  && cmake --install /tmp/ttyd/build \
  && rm -rf /tmp/ttyd \
  && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb \
  && dpkg -i /tmp/packages-microsoft-prod.deb \
  && rm -f /tmp/packages-microsoft-prod.deb \
  && apt-get update \
  && apt-get install -y --no-install-recommends powershell \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g opencode-ai \
  && useradd --create-home --home-dir /home/nexus --shell /usr/bin/pwsh nexus \
  && mkdir -p /workspace /var/run/nginx \
  && chown -R nexus:nexus /home/nexus /workspace \
  && rm -f /etc/nginx/sites-enabled/default
COPY cloud-workstation/nginx.conf /etc/nginx/conf.d/nexus.conf
COPY cloud-workstation/launch.sh /usr/local/bin/nexus-workstation-start
COPY cloud-workstation/portal/ /usr/share/nginx/html/portal/
RUN chmod 755 /usr/local/bin/nexus-workstation-start
EXPOSE 10000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["/usr/local/bin/nexus-workstation-start"]
