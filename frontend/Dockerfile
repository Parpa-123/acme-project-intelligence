# ---------- Builder ----------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

#   ----------- Runner -----------
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Install a lightweight static file server
RUN bun add -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "3000"]