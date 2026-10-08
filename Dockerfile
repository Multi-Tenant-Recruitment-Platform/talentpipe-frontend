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
#
# --ignore-scripts: no dependency here needs an install-time script — esbuild
# (vite's bundler) resolves its native binary through optionalDependencies,
# which npm installs regardless of this flag (verified), so skipping lifecycle
# scripts costs nothing and closes off arbitrary code execution from a
# compromised package's postinstall hook.
COPY package*.json ./
RUN npm ci --ignore-scripts

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

# Run as the image's own unprivileged `nginx` user rather than root. Binding
# port 80 needs CAP_NET_BIND_SERVICE, which a non-root process doesn't have,
# so the server listens on 8080 instead (see nginx.conf.template) — the
# compose file maps the host's familiar 5173 to this internally, so nothing
# external changes.
#
# The base image creates the nginx:nginx user/group (101:101), but — verified
# directly against the image, not assumed — /var/cache/nginx is root:root
# 755, not nginx-owned. nginx creates its temp subdirectories (client_temp,
# proxy_temp, …) there lazily at startup, so without this chown the worker
# fails immediately with "mkdir() ... Permission denied" and the container
# crash-loops. /etc/nginx/conf.d needs the same treatment: the entrypoint's
# envsubst step, which renders nginx.conf.template, now runs as this same
# non-root user and writes its output there.
RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx /var/run/nginx.pid /etc/nginx/conf.d /var/cache/nginx
USER nginx

EXPOSE 8080

# busybox wget — the alpine image ships no curl.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
