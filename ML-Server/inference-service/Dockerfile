# Note: Build context should be ML-Server/ directory (e.g. docker build -f inference-service/Dockerfile .)
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY inference-service/requirements.txt ./inference-service/
RUN pip install --no-cache-dir -r inference-service/requirements.txt

# Copy application code
COPY models/ ./models/
COPY inference-service/ ./inference-service/

WORKDIR /app/inference-service

ENV PYTHONPATH=/app:/app/inference-service \
    PYTHONUNBUFFERED=1 \
    ML_MODEL_CHECKPOINT=baseline_latest.pt

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
