# --- dev: hot-reload target used by docker-compose.override.yml ---
# Deps + source are bind-mounted from the host at runtime (see the override),
# so this stage stays minimal; the compose command runs install + migrate +
# seed + watch.
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- prod (default build target) ---
FROM node:20-alpine AS prod

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
# Keep dev deps: prisma + tsx are needed for `prisma migrate deploy` and the
# tsx-based seed script at runtime.
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

# migrate + seed + start is orchestrated from docker-compose `command`.
CMD ["npm", "start"]
