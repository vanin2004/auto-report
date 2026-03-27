FROM python:3.12-slim

# ── System packages: XeLaTeX + Cyrillic fonts ─────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      xz-utils \
      texlive-xetex \
      texlive-lang-cyrillic \
      texlive-latex-recommended \
      texlive-fonts-recommended \
      fonts-dejavu \
      fontconfig \
    && fc-cache -fv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Pandoc 3.x ────────────────────────────────────────────────────────────
ARG PANDOC_VERSION=3.6.4
RUN curl -fsSL \
      "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb" \
      -o /tmp/pandoc.deb \
    && dpkg -i /tmp/pandoc.deb \
    && rm /tmp/pandoc.deb \
    && pandoc --version

# ── pandoc-crossref ───────────────────────────────────────────────────────
# v0.3.19 is built against Pandoc v3.6.4 — must match PANDOC_VERSION above
ARG CROSSREF_VERSION=0.3.19
RUN curl -fsSL \
      "https://github.com/lierdakil/pandoc-crossref/releases/download/v${CROSSREF_VERSION}/pandoc-crossref-Linux-X64.tar.xz" \
      -o /tmp/crossref.tar.xz \
    && tar -xJf /tmp/crossref.tar.xz -C /tmp/ \
    && install -m 755 /tmp/pandoc-crossref /usr/local/bin/pandoc-crossref \
    && rm -f /tmp/crossref.tar.xz /tmp/pandoc-crossref \
    && pandoc-crossref --version

WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
