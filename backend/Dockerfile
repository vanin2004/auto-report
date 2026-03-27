FROM python:3.12-slim

# ── System packages: Pandoc + XeLaTeX + Cyrillic fonts ───────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      pandoc \
      texlive-xetex \
      texlive-lang-cyrillic \
      texlive-latex-recommended \
      texlive-fonts-recommended \
      fonts-dejavu \
    && fc-cache -fv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
