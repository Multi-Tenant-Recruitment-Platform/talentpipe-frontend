# TalentPipe — Frontend

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

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8080/api/v1 -t talentpipe-frontend .
docker run -p 5173:80 talentpipe-frontend
```

Multi-stage build: Node 20 builds `dist/`, nginx serves it with SPA fallback
(`nginx.conf`).
