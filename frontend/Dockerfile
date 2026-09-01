# MediGuard AI — Frontend (role-based dashboard) Dockerfile
# Multi-stage build: compile with Vite, serve the static bundle with nginx.

# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL is baked in at build time (Vite env vars are compile-time,
# not runtime) — override via --build-arg or docker-compose's `args:` if your
# backend isn't reachable at the default /api/v1 relative path.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Stage 2 — Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
