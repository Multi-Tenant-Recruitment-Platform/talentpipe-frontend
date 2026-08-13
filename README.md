# TalentPipe — Frontend

[![frontend-ci](https://github.com/RavinduIT/talentpipe-frontend/actions/workflows/ci.yml/badge.svg?branch=development)](https://github.com/RavinduIT/talentpipe-frontend/actions/workflows/ci.yml)

React single-page app for **TalentPipe**, the multi-tenant recruitment platform.
The Spring Boot API lives in a separate repository: **talentpipe-backend**.

## Tech stack

| Piece | Tech |
|---|---|
| Framework | React 18 + TypeScript, Vite 5, React Router 6 |
| Styling | Tailwind CSS 3 |
| HTTP | Axios (central client with token refresh interceptor) |
| Quality | TypeScript strict mode, SonarQube/SonarCloud, GitHub Actions CI |

## Repository layout

```
src/
  api/        axios client, token store, typed endpoint calls
  auth/       AuthContext (session restore, login/register/logout)
  components/ Layout, ProtectedRoute, auth shell, dashboard primitives
  layouts/    DashboardLayout (sidebar + top bar)
  pages/      public pages + dashboard pages
  data/       temporary fixtures being replaced by real API calls
  utils/      formatting helpers
```

## Branching & contributing

| Branch | Purpose | Rules |
|---|---|---|
| `master` | Production-ready | PR only · **2 approvals** · CI green |
| `development` | Integration | PR only · **1 approval** · CI green |
| `feature/*` | All work | branch off `development` |

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Quick start

Prerequisite: the backend API running on `http://localhost:8080`.

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` → `http://localhost:8080` (`vite.config.ts`), so
no extra configuration is needed. Type-check + production build:

```bash
npm run build
```

## API integration

- Base URL: `import.meta.env.VITE_API_BASE_URL ?? '/api/v1'` (`src/api/client.ts`).
- Access tokens live in memory only; the refresh token in `localStorage`
  restores sessions across reloads.
- A `401` triggers a single-flight `POST /auth/refresh` and one retry; failure
  broadcasts a session-expired event that logs the user out.
- Company login sends the tenant as the `X-Tenant-Subdomain` header; candidates
  authenticate globally without it.

## Docker

The backend stack is managed from its own repository, so start it first:

```bash
cd ../talentpipe-backend/infra && docker compose up -d postgres backend
```

Then, from this repository:

```bash
docker compose up -d --build      # http://localhost:5173
```

Multi-stage build: Node 20 builds `dist/`, nginx serves it with SPA fallback
(`nginx.conf.template`).

**nginx proxies `/api` to the backend**, so the browser talks to a single
origin and CORS never applies — the same arrangement the Vite dev server uses
(`vite.config.ts`). That is why `VITE_API_BASE_URL` is the relative `/api/v1`
in both dev and Docker; an absolute URL here would bake a host into the image
and force CORS open.

The container serves on **5173** deliberately: the backend builds emailed
invitation and verification links from `FRONTEND_BASE_URL`, whose default is
`http://localhost:5173`, so those links resolve without reconfiguring it. This
is the same port `npm run dev` uses — run one or the other, not both.

| Variable | Default | Applies |
|---|---|---|
| `BACKEND_ORIGIN` | `http://host.docker.internal:8080` | run time (no trailing slash) |
| `VITE_API_BASE_URL` | `/api/v1` | build time |
| `VITE_APP_ROOT_DOMAIN` | `talentpipe.io` | build time |
| `FRONTEND_PORT` | `5173` | run time |

`BACKEND_ORIGIN` is substituted into the nginx config at container start, so
pointing the SPA at a different API needs no rebuild. Because it resolves over
`host.docker.internal`, the backend can be a container or a plain
`mvnw spring-boot:run` on the host — both work unchanged.
