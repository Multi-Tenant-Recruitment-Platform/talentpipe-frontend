# ---------------------------------------------------------------------------
# Multi-stage build: Node compiles the SPA, nginx serves the static output.
#
# The build toolchain (vite, vitest, typescript) exists only in the first
# stage and is discarded, so none of it — nor any of its CVEs — reaches the
# shipped image. The runtime image contains static files and nginx, nothing more.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copied before the sources so this layer is reused whenever only app code
# changes. `npm ci` installs devDependencies too — the build needs them.
COPY package*.json ./
RUN npm ci

COPY . .

# Relative on purpose. nginx proxies /api to the backend (see
# nginx.conf.template), so the browser talks to a single origin and CORS never
# enters the picture. An absolute http://localhost:8080 here would bake a
# developer's machine into a production artifact and require CORS to be opened.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

# Rendered by the image's own entrypoint (envsubst) at container start, so the
# backend address is a run-time setting rather than a baked-in constant. No
# trailing slash: nginx appends the original request URI to it.
ENV BACKEND_ORIGIN=http://host.docker.internal:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# busybox wget — the alpine image ships no curl.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
