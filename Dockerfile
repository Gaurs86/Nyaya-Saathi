# Dockerfile for Render deployment
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY nyaya-saathi/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY nyaya-saathi /app

ENV PORT 8000

EXPOSE ${PORT}

CMD ["/usr/local/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "${PORT}"]
