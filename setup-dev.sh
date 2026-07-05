#!/usr/bin/env bash
#
# Bootstrap the local development files (both gitignored, never committed):
#
#   .env                        - from .env.example, with local dev defaults
#   docker-compose.override.yml - self-contained dev stack (bundled Postgres +
#                                 hot-reload dev targets) auto-merged onto
#                                 docker-compose.yml
#
# Existing files are left untouched; pass --force (-f) to overwrite them.
#
#   ./setup-dev.sh
#   ./setup-dev.sh --force
#
set -euo pipefail

# Run relative to the repo root (this script's directory).
cd "$(dirname "$0")"

FORCE=0
case "${1:-}" in
  -f|--force) FORCE=1 ;;
  "") ;;
  *) echo "usage: $0 [--force]" >&2; exit 2 ;;
esac

# Returns 0 if we should (re)write $1, 1 if it exists and --force was not given.
should_write() {
  if [[ -e "$1" && "$FORCE" -ne 1 ]]; then
    echo "exists, skipping: $1  (use --force to overwrite)"
    return 1
  fi
  return 0
}

# --- .env ----------------------------------------------------------------
if should_write ".env"; then
  if [[ ! -f .env.example ]]; then
    echo "error: .env.example not found" >&2
    exit 1
  fi
  cp .env.example .env
  # Local dev runs the bundled Postgres, so use the same default password the
  # override's db service expects instead of the prod placeholder.
  sed -i.bak 's/change-me-strong-password/devpassword/g' .env && rm -f .env.bak
  echo "created: .env"
fi

# --- docker-compose.override.yml -----------------------------------------
if should_write "docker-compose.override.yml"; then
  cat > docker-compose.override.yml <<'OVERRIDE_EOF'
# Local development only (gitignored, not used on the VPS). Auto-merged by
# Compose on top of the production docker-compose.yml:
#
#   docker compose up
#
# It flips the server/client to their `dev` build targets (hot reload via
# bind-mounted source), adds a self-contained Postgres so no infra repo is
# required, makes the backend/dokploy-network networks local instead of
# external, and publishes the dev ports (offset from habitmaxxing's 3000/4000/
# 5432 so both stacks can run side by side):
#
#   Client:  http://localhost:3002   (log in with the seeded demo account below)
#   Server:  http://localhost:4001   (API under /api/...)
#   DB:      localhost:5433          (postgres / devpassword)
#
# Overridable defaults use ${VAR:-default}; set them in a `.env` next to this
# file to customise without editing it.
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
      POSTGRES_DB: ${POSTGRES_DB:-fitnessmaxxing}
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - fitnessmaxxing_dev_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-fitnessmaxxing}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks: [backend]

  server:
    build:
      target: dev
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-devpassword}@db:5432/${POSTGRES_DB:-fitnessmaxxing}?schema=public
      APP_URL: ${APP_URL:-http://localhost:3002}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3002}
      COOKIE_SECURE: ${COOKIE_SECURE:-false}
      # Empty SMTP_HOST => verification/reset emails print to the server console.
      SMTP_HOST: ${SMTP_HOST:-}
      SEED_USER_EMAIL: ${SEED_USER_EMAIL:-demo@fitnessmaxxing.local}
      SEED_USER_PASSWORD: ${SEED_USER_PASSWORD:-password123}
    # Install deps into the named volume, sync the Prisma client, apply
    # migrations + seed, then start the watcher.
    command: >
      sh -c "npm install &&
             npx prisma generate &&
             npx prisma migrate deploy &&
             npx prisma db seed &&
             npm run dev"
    volumes:
      - ./server:/app
      # Named volume shadows the host's (macOS-built) node_modules with the
      # container's Linux build.
      - fitnessmaxxing_dev_server_modules:/app/node_modules
    ports:
      - "4001:4000"

  client:
    build:
      target: dev
    depends_on:
      - server
    environment:
      # Unset VITE_API_URL => client uses relative /api and Vite proxies it to
      # the server service (see client/vite.config.ts).
      VITE_APP_TZ: ${VITE_APP_TZ:-Europe/Amsterdam}
    command: sh -c "npm install && npm run dev"
    volumes:
      - ./client:/app
      - fitnessmaxxing_dev_client_modules:/app/node_modules
    ports:
      - "3002:3000"

volumes:
  fitnessmaxxing_dev_db:
  fitnessmaxxing_dev_server_modules:
  fitnessmaxxing_dev_client_modules:

networks:
  # Local dev creates its own networks instead of joining the shared/Dokploy
  # ones (overrides external: true from docker-compose.yml).
  backend:
    external: false
  dokploy-network:
    external: false
OVERRIDE_EOF
  echo "created: docker-compose.override.yml"
fi

echo
echo "Done. Start the dev stack with:"
echo "  docker compose up --build"
echo "    client -> http://localhost:3002   (demo@fitnessmaxxing.local / password123)"
echo "    server -> http://localhost:4001"
