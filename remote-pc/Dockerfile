FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV HOME=/home/nexus

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium xvfb x11vnc fluxbox nginx apache2-utils novnc websockify \
    gettext-base ca-certificates tini fonts-liberation util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/sh nexus \
    && mkdir -p /etc/nginx/templates /var/run/nginx \
    && rm -f /etc/nginx/sites-enabled/default \
    && chown -R nexus:nexus /home/nexus

COPY remote-pc/nginx.conf.template /etc/nginx/templates/nexus.conf.template
COPY remote-pc/start.sh /usr/local/bin/nexus-remote-start
RUN chmod 755 /usr/local/bin/nexus-remote-start

EXPOSE 10000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["/usr/local/bin/nexus-remote-start"]
