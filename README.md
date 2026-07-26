# TalentPipe — Frontend

React 18 + TypeScript + Vite single-page app for **TalentPipe**, the multi-tenant
recruitment intelligence platform. The Spring Boot API lives in its own repository:
**talentpipe-backend**.

## Stack

- React 18 + TypeScript, Vite 5, React Router 6
- Tailwind CSS 3, Axios
- No global state library — auth state via React context (`src/auth/AuthContext.tsx`)

## Branching model & contribution rules

| Branch | Purpose | Rules |
|---|---|---|
| `master` | Production-ready code | PR only · **2 approvals** · CI green |
| `development` | Integration branch | PR only · **1 approval** · CI green |
| `feature/*` | All work happens here | branch off `development`, PR back into `development` |

Direct pushes to `master` and `development` are blocked by branch protection.
Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first PR.

## Running locally

Prerequisite: the backend API on `http://localhost:8080` (see the backend repo).

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` → `http://localhost:8080`
(`vite.config.ts`), so no extra configuration or CORS setup is needed.

Type-check + production build:

```bash
npm run build
```

## How the app talks to the API

- Base URL: `import.meta.env.VITE_API_BASE_URL ?? '/api/v1'` (`src/api/client.ts`).
- **Access token** lives in memory only (15-min lifetime); **refresh token** in
  `localStorage` so sessions survive reloads.
- A 401 response triggers a single-flight refresh (`POST /auth/refresh`), then one
  retry; if refresh fails, a `talentpipe:session-expired` event logs the user out.
- Tenant context at login travels as the `X-Tenant-Subdomain` header (company tab);
  candidates log in globally without it.

## Docker

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8080/api/v1 -t talentpipe-frontend .
docker run -p 5173:80 talentpipe-frontend
```

Multi-stage build: Node 20 builds `dist/`, nginx serves it with SPA fallback
(`nginx.conf`). In production the SPA calls the API at the absolute `VITE_API_BASE_URL`.

## Structure

```
src/
  api/        axios client, token store, typed endpoint calls
  auth/       AuthContext (session restore, login/register/logout)
  components/ Layout, ProtectedRoute, auth shell, dashboard primitives
  layouts/    DashboardLayout (sidebar + top bar)
  pages/      public pages (landing, jobs, auth flows) + dashboard pages
  data/       mockDashboard.ts — fixtures being replaced by real APIs (TODO(sprint2))
  utils/      formatting helpers
```

Feature status: all authentication flows (company + candidate registration, email
verification, login, password reset, invite acceptance) and the Team page
(list/invite/resend/revoke) are fully wired to the API. Dashboard analytics
(Overview KPIs, Pipeline, plan usage, notifications) still render mock data from
`src/data/mockDashboard.ts` until the job/pipeline/tenant endpoints land in Sprint 2.
