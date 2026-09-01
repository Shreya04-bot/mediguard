FROM python:3.11-slim

# System dependencies (Tesseract for OCR, espeak for TTS, poppler for PDFs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    poppler-utils \
    espeak \
    libespeak1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Build context is the repo root so that models/ (the trained pickles) come along.
COPY backend/ ./backend/
COPY models/ ./models/

RUN mkdir -p backend/data/models \
             backend/data/uploads \
             backend/data/chroma_db \
             backend/data/chroma_ayurveda \
             backend/data/guidelines \
             backend/data/raw \
             backend/data/processed \
             models/versions

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
