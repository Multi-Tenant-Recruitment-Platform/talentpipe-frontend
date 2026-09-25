# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the company admin / hiring owner** (`COMPANY_ADMIN`). The person who
creates the company workspace, invites the hiring team, configures the company
profile and settings, and owns the hiring pipeline end to end. This is the role
the product is built around and the one future design work optimizes for.

Secondary roles inside the same workspace, each seeing a permission-scoped
subset of the same chrome:

- `HR_MANAGER` — works the pipeline day to day; may move candidates between
  stages and read settings, but cannot manage the team.
- `INTERVIEWER` — read-only participant: overview, pipeline, company profile,
  job browsing.
- `CANDIDATE` — outside the workspace entirely. One account, used to browse
  open positions across every hiring company and to track their own
  applications. Deliberately secondary in design investment today.

The authoritative role/permission matrix lives in `src/auth/permissions.ts` and
is the single source of truth for who sees what in the SPA.

## Product Purpose

TalentPipe is a multi-tenant recruitment platform. A company registers its own
workspace, invites its hiring team into role-scoped access, and runs candidates
through a hiring pipeline in one place, instead of across spreadsheets, inboxes
and disconnected tools.

Success for the primary user: a hiring owner can stand up a workspace, get their
team into it, and see the true state of every open role without assembling that
picture by hand.

## Positioning

The intended differentiator is **intelligence over the pipeline** — scoring and
insight that tell a hiring owner what their funnel actually means, not just a
board that stores candidate records. Funnel analytics, recruitment-health
signals and candidate scoring are the mechanism meant to separate TalentPipe
from a conventional ATS or a spreadsheet.

**This is a committed product direction, not a shipped capability.** Nothing in
the codebase implements scoring or real analytics yet; the overview and pipeline
pages read from `src/data/mockDashboard.ts` fixtures. Future work may build
toward this claim and may state it as intent, but must not present it as
something the product demonstrably does until the capability exists.

## Operating Context

- Single-page React app in the browser; the Spring Boot API lives in the
  separate `talentpipe-backend` repository. Both must run for anything
  authenticated to work.
- The company workspace (`/dashboard`) has its own full-screen chrome —
  sidebar plus top bar — separate from the marketing/auth chrome that wraps the
  public pages.
- Several entry points arrive from email, landing on public routes carrying a
  token in the query string: email verification, password reset, and team
  invitation acceptance. These are real, load-bearing surfaces, not edge cases.
- Company users and candidates both sign in with email and password only. The
  backend resolves which account and tenant they belong to. **No workspace
  subdomain is ever asked for, sent, or shown anywhere in the UI** — this was a
  deliberate reversal and must not be reintroduced.

Domain vocabulary in use: hiring funnel stages are **Applied → Screening →
Interview → Offer → Hired**; a **job pipeline** is one open role's candidates;
**plan usage** covers seats and billing limits.

## Capabilities and Constraints

**Shipped and API-backed:** registration (company and candidate), login with
in-memory access tokens plus `localStorage` refresh-token session restore,
email verification, password reset, team listing and invitations (invite,
resend, revoke), and the company profile record.

**Present but fixture-backed** — `src/data/mockDashboard.ts`, marked
`TODO(sprint2)`: overview statistics, hiring funnel, recruitment health,
pipeline insights, job pipelines, upcoming interviews, activity feed, and plan
usage. Any surface built on these is showing placeholder numbers.

**Not yet built:** candidate scoring and real analytics; moving candidates
between stages (`pipeline.manage` is defined but unimplemented); `PATCH /tenant`
for editing settings; any public, candidate-facing company page.

**Technical constraints:**

- React 18 + TypeScript (strict) + Vite 5, React Router 7.
- **Ant Design 6** is the committed UI library. Tailwind CSS was deliberately
  removed from this project; the README's "Tailwind CSS 3" row is stale and
  contradicts the code. Do not reintroduce Tailwind or utility-class styling.
- `VITE_API_BASE_URL` stays the relative `/api/v1` in both dev and Docker — the
  dev server and nginx both proxy `/api` to the backend so the browser talks to
  one origin and CORS never applies. An absolute URL would bake a host into the
  image and force CORS open.
- The frontend permission map must never be more permissive than the backend.
  It is a UX guard, not a security boundary; the API enforces role and tenant
  scope on every request.
- Branch protection: work branches off `development`; `master` needs two
  approvals, `development` one, CI green either way.

## Brand Commitments

- Name: **TalentPipe**. The public one-liner in use is "the multi-tenant
  recruitment intelligence platform."
- The landing page presents two doors by audience — "For employers" and "For
  job seekers" — each with its own registration path.
- Existing assets: `public/favicon.svg`, `public/icons.svg`,
  `src/assets/hero.png`, `src/assets/interview.jpg`.
- No logo, typeface, palette or voice guide has been established as binding.

## Evidence on Hand

**Pre-launch: real product intent, no customers yet.** Nothing in the repository
is real usage data — every number on the dashboard is fixture content.

Therefore no surface may display customer names, logos, testimonials, case
studies, press mentions, user counts, hiring metrics, or pricing as though they
were real. These do not exist and must never be fabricated to fill a layout. If
a design needs social proof or numbers, that is a signal to change the design or
to ask, not to invent evidence.

## Product Principles

1. **The hiring owner's clarity comes first.** Every workspace surface should
   answer "what is the true state of my hiring right now?" before it offers
   anything else.
2. **Role-scoped truth.** A user sees exactly what their permission allows —
   never a control that only fails at the API, never a page that greets them
   with a 403.
3. **Claim only what exists.** Intelligence is the direction, not yet the
   product. Placeholder data must never be dressed up as insight.
4. **One workspace, many people.** Design for a team sharing a tenant, not a
   single operator — invitations, roles and handoffs are core, not admin trivia.
5. **Email is part of the product.** Verification, reset and invitation links
   land on real surfaces that deserve the same care as the dashboard.

## Accessibility & Inclusion

No specific standard has been committed to by the team. Existing components do
use ARIA attributes and semantic roles, so the working floor is: keep semantic
markup and ARIA correct, and do not regress what is already there. Revisit if a
formal target (e.g. WCAG 2.1 AA) is adopted.
