# --- dev: hot-reload target used by docker-compose.override.yml ---
# Source + deps are bind-mounted from the host at runtime (see the override);
# the compose command runs install + the Vite dev server.
FROM node:20-alpine AS dev
WORKDIR /app
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- prod build (default build target) ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src

# Vite inlines VITE_* env at build time. Pass the production origins in:
# the platform API (ruudjuffermans-server) and the central account app.
ARG VITE_API_URL=https://api.ruudjuffermans.nl
ARG VITE_ACCOUNT_URL=https://account.ruudjuffermans.nl
ARG VITE_APP_TZ=Europe/Amsterdam
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ACCOUNT_URL=$VITE_ACCOUNT_URL
ENV VITE_APP_TZ=$VITE_APP_TZ

RUN npm run build

# --- serve static build with nginx (SPA fallback) ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
