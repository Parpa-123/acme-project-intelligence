# ---------- Builder ----------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Create a virtual environment
RUN uv venv

ENV PATH="/app/.venv/bin:$PATH"

# Install build dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .


RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --requirement requirements.txt
# Copy application source and migrations
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .


# ---------- Runner ----------
FROM python:3.13-slim-bookworm AS runner

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies including supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder
COPY --from=builder /app/.venv /app/.venv

# Copy only the application code and migrations
COPY --from=builder /app/src ./src
COPY --from=builder /app/alembic ./alembic
COPY --from=builder /app/alembic.ini ./alembic.ini

# Copy deployment scripts
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
