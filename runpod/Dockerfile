FROM ollama/ollama:latest
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip curl && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages --no-cache-dir "runpod>=1.7,<2"
COPY handler.py /app/handler.py
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
WORKDIR /app
CMD ["/app/start.sh"]
