# Job Vacancies API — backend contract

**For:** the backend engineer implementing the Job module in `talentpipe-backend`.
**Backlog:** PB-011 (create), PB-018 (publish), PB-019 (edit), PB-020 (close), PB-021 (duplicate), PB-022 (archive).
**Status:** implemented on both sides. The backend module is `com.talentpipe.job` on the backend branch
`feature/job-vacancy-management` (migration `V11__job_vacancies.sql`, tests `JobVacancyServiceTest` and
`JobVacancyFlowIntegrationTest`). Every vacancy screen calls these endpoints; there is no local fallback. Against a
backend without the module, `/dashboard/jobs` shows *"Vacancies couldn't be loaded — this server doesn't offer the jobs API yet."*

The client half of this contract is [`src/api/jobs.ts`](../../src/api/jobs.ts) and the DTO mirrors in
[`src/api/types.ts`](../../src/api/types.ts). If anything here has to change, change it in all three places
in the same PR pair.

---

## 1. Conventions (same as `TeamController` / `TenantController`)

- Base path `/api/v1`. JSON in and out.
- **Tenant comes only from the access token** (`principal.tenantId()`). No path, query or body field names a tenant.
- **A vacancy in another tenant answers `404`**, the same as one that does not exist (`ResourceNotFoundException`).
- Errors use the standard `ErrorResponse` envelope through `GlobalExceptionHandler`.
- **The `message` on `400` and `422` is shown to the recruiter word for word.** Write it as a sentence for a person
  (for example *"This vacancy can't be published yet: add a job summary and at least one required skill."*), not as
  `"jobSummary: must not be blank"`. Other statuses get their own copy in the frontend (`src/dashboard/vacancyErrors.ts`).
- Lists use the existing `PageResponse<T>`.

## 2. Authorization

| Role | Access |
|---|---|
| `COMPANY_ADMIN` | everything below |
| `HR_MANAGER` | everything below |
| `INTERVIEWER` | none → `403` |
| `CANDIDATE` | none → `403` (candidates see published jobs through `/public/jobs` only) |

`@PreAuthorize("hasAnyRole('COMPANY_ADMIN','HR_MANAGER')")` on the controller. This matches the frontend's
`jobs.manage` permission (`src/auth/permissions.ts`). **The frontend must never be more permissive than this.**
If you split permissions (for example only admins may archive), tell the frontend so the matrix changes with it.

## 3. Endpoints

| Method | Path | Body | Success | Purpose |
|---|---|---|---|---|
| GET | `/jobs?page=0&size=100` | — | `200 PageResponse<JobVacancyResponse>` | Every vacancy in the tenant, **archived included**, sorted `createdAt DESC`. `size` max 100. |
| GET | `/jobs/{id}` | — | `200 JobVacancyResponse` | One vacancy. |
| POST | `/jobs` | `JobVacancyRequest` | `201 JobVacancyResponse` | Create as `DRAFT` or straight to `PUBLISHED`. |
| PUT | `/jobs/{id}` | `JobVacancyUpdateRequest` | `200 JobVacancyResponse` | Replace content. **Never changes status.** |
| POST | `/jobs/{id}/publish` | — | `200 JobVacancyResponse` | `DRAFT → PUBLISHED` |
| POST | `/jobs/{id}/close` | — | `200 JobVacancyResponse` | `PUBLISHED → CLOSED` |
| POST | `/jobs/{id}/archive` | — | `200 JobVacancyResponse` | `CLOSED → ARCHIVED` |

Every write returns the vacancy **as now stored**. The frontend renders that response and does not guess.

**Duplicate (PB-021) needs no endpoint.** The frontend reads `GET /jobs/{id}`, prefills the form and later calls
`POST /jobs`. Nothing is stored until the recruiter saves.

**There is no DELETE**, and no reopen, unpublish or unarchive. Those are not in the backlog; see §9.

How the frontend loads the list: it walks pages of 100 until `page + 1 >= totalPages`, then filters, counts and
sorts on the client, the same way the team roster works. That is fine for tens or hundreds of vacancies. If a tenant
can realistically reach thousands, add the optional server-side filters in §8 and tell the frontend.

## 4. State machine

```
DRAFT ──publish──▶ PUBLISHED ──close──▶ CLOSED ──archive──▶ ARCHIVED
```

| From \ action | publish | close | archive | PUT (edit) |
|---|---|---|---|---|
| DRAFT | ✅ (if complete, §6) | 422 | 422 | ✅ draft rules |
| PUBLISHED | 422 | ✅ | 422 | ✅ publish rules |
| CLOSED | 422 | 422 | ✅ | 422 |
| ARCHIVED | 422 | 422 | 422 | 422 |

- An illegal move is a **`422` business rule** (`BusinessRuleException`), for example *"Only a published vacancy can be closed."*
  The frontend treats a 422 on a move as "my screen is stale" and re-fetches.
- On each move set the matching timestamp (`publishedAt`, `closedAt`, `archivedAt`) and bump `updatedAt`.
- If a vacancy is created directly as `PUBLISHED`, set `publishedAt` in the same request. The detail page treats
  `publishedAt` within 5 seconds of `createdAt` as "never a draft" and shows the Draft step as "Skipped".
- **Effects downstream:**
  - `PUBLISHED`: appears in `GET /public/jobs` (PB-018).
  - `CLOSED`: drops out of `/public/jobs`, and the applications module must refuse new applications (PB-020).
    Existing applications are kept.
  - `ARCHIVED`: same as closed, plus it leaves the default list view (the frontend handles that part).

## 5. DTOs

### `JobVacancyRequest` (POST body)

Types are JSON. "Draft" means what a `DRAFT` may hold. "Publish" means what is required to be `PUBLISHED` (see §6).

| Field | Type | Draft | Notes / limits |
|---|---|---|---|
| `title` | string | may be `""` | ≤ 120 chars, whitespace collapsed by the client |
| `department` | string | may be `""` | free text; usually one of the tenant profile's `departments` |
| `openings` | int | always sent | 1–999 |
| `employmentType` | enum \| null | may be null | `FULL_TIME` `PART_TIME` `CONTRACT` `INTERNSHIP` `TEMPORARY` |
| `workplaceType` | enum \| null | may be null | `ON_SITE` `REMOTE` `HYBRID` |
| `location` | string | may be `""` | ≤ 120 chars. Still required when `REMOTE` ("the region it hires from"). |
| `applicationDeadline` | `"YYYY-MM-DD"` \| null | may be null, may be past | `LocalDate`. A day, not an instant. |
| `jobSummary` | string | may be `""` | ≤ 300 |
| `jobDescription` | string | may be `""` | ≤ 5000, line breaks preserved |
| `keyResponsibilities` | string[] | may be `[]` | blank entries already stripped |
| `requiredSkills` | string[] | may be `[]` | |
| `preferredSkills` | string[] | | |
| `minimumExperienceYears` | int \| null | | 0–50 |
| `education` | string \| null | | one of the frontend's `EDUCATION_LEVELS` labels |
| `certifications` | string[] | | |
| `languageRequirements` | string[] | | |
| `otherRequirements` | string \| null | | ≤ 1000 |
| `salaryMin` / `salaryMax` | number \| null | | ≥ 0; `max ≥ min` when both present |
| `currency` | string \| null | | **required if either salary is set.** Currently the client sends a label like `"LKR — Sri Lankan rupee"` (see §9). |
| `payPeriod` | enum \| null | | `HOURLY` `MONTHLY` `ANNUAL`; required if either salary is set |
| `benefits` | string[] | | identifiers from the company-profile benefits catalogue |
| `workingDays` | enum[] | | `MON` … `SUN` |
| `workingHours` | string \| null | | ≤ 60, for example `"9:00 AM – 6:00 PM"` |
| `shiftType` | enum \| null | | `DAY` `NIGHT` `ROTATING` `FLEXIBLE` |
| `expectedHoursPerWeek` | number \| null | | > 0 and ≤ 168 |
| `assignedRecruiterId` | UUID \| null | | must be an **ACTIVE user in the same tenant**, otherwise 422 |
| `hiringManagerId` | UUID \| null | | same rule |
| `recruitmentPipelineId` | string \| null | | `STANDARD` `TECHNICAL` `EXECUTIVE` |
| `screeningQuestions` | string[] | | ≤ 10 entries |
| `status` | enum | | **only `DRAFT` or `PUBLISHED`** on create, otherwise 400 |

Shape rules (lengths, ranges, enum membership, salary pairing, tenant-member ids) apply in **every** state, drafts
included. Only the *required-ness* in §6 depends on state.

Lists are always arrays, never null. Blank optionals arrive as `null`, never `""`, except the six basics marked
"may be `""`" above.

### `JobVacancyUpdateRequest` (PUT body)

Every `JobVacancyRequest` field **except `status`**, plus:

| Field | Type | Notes |
|---|---|---|
| `version` | int | The `version` from the response being edited. Use JPA `@Version`. A stale value → **`409`** (`ObjectOptimisticLockingFailureException` → map it to 409). |

PUT is a full replacement: `null` means "cleared".

### `JobVacancyResponse`

Every `JobVacancyRequest` field (with the current `status`), plus:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `version` | int | optimistic-lock counter, starts at 0 |
| `createdAt` / `updatedAt` | ISO-8601 instant | |
| `publishedAt` / `closedAt` / `archivedAt` | ISO-8601 instant \| null | set on entering that state, never cleared |
| `applicantCount` | int \| null | **Send `null` until the applications module exists.** The UI shows "Not connected yet". `0` would claim nobody applied. |

Do **not** include `tenantId`. The frontend's tenant guard (`src/api/tenantGuard.ts`) rejects any payload whose
`tenantId` differs from the session's, so leaving it out keeps responses clean.

## 6. Publish rules

These apply to `POST /jobs` with `status: PUBLISHED`, to `POST /jobs/{id}/publish`, and to `PUT` on a `PUBLISHED`
vacancy. They mirror `validateVacancy` in `src/dashboard/jobVacancy.ts`, so the frontend normally catches them first,
but **the server is the authority**.

Required and non-blank:
- `title`, `department`, `location`, `employmentType`, `workplaceType`
- `openings` ≥ 1
- `applicationDeadline` **on or after today** in the tenant's timezone (fall back to UTC if the tenant has none)
- `jobSummary`, `jobDescription`
- `keyResponsibilities`: at least one
- `requiredSkills`: at least one

On failure return `422` with **one** human sentence naming what is missing, for example
*"This vacancy can't be published yet: add an application deadline, a job summary and at least one required skill."*

## 7. Status codes

| Code | When |
|---|---|
| 400 | malformed body, bad enum, shape violation (length, range), `status` not DRAFT/PUBLISHED on create |
| 401 | missing or expired token (handled globally) |
| 403 | role not allowed |
| 404 | unknown id or another tenant's id |
| 409 | stale `version` on PUT |
| 422 | illegal transition, publish rules not met, edit on CLOSED/ARCHIVED, recruiter/manager not an active member of the tenant, salary max below min, salary without currency or pay period, unknown pipeline id |

## 8. Optional later: server-side list filtering

Not needed now. If the list grows large, accept these on `GET /jobs` and the frontend will switch to them:
`status` (`DRAFT|PUBLISHED|CLOSED|ARCHIVED|ACTIVE` where ACTIVE means "not archived"), `q` (title, department,
location, skills), `department`, `sort` (`createdAt,desc` | `updatedAt,desc` | `applicationDeadline,asc` | `title,asc`),
plus `GET /jobs/counts` → `{ "DRAFT": 3, "PUBLISHED": 12, "CLOSED": 3, "ARCHIVED": 4 }`.

## 9. Open decisions (please confirm or push back)

1. **Transitions.** Is there ever a reopen (CLOSED → PUBLISHED) or unarchive? The frontend offers neither until you say so.
   The one place to change is `VACANCY_TRANSITIONS` in `src/dashboard/jobVacancy.ts`.
2. **Auto-close at the deadline.** Should a scheduled job close vacancies whose deadline has passed? Today the UI flags
   them as "Deadline passed" and leaves closing to the recruiter.
3. **Currency format.** The form stores a display label (`"LKR — Sri Lankan rupee"`). An ISO-4217 code (`"LKR"`) would
   be cleaner. If you want codes, say so and the frontend will send the code only.
4. **Role split.** Is archiving admin-only? (Currently admin and HR manager can do everything.)

## 10. Suggested schema (Flyway)

Take the next free version number. `V8` is taken on the shared dev DB even though it isn't on `development`, so this
is likely `V10`.

```sql
CREATE TABLE job_vacancies (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                 UUID NOT NULL REFERENCES tenants (id),
    version                   INTEGER NOT NULL DEFAULT 0,
    status                    VARCHAR(20) NOT NULL
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),

    title                     VARCHAR(120) NOT NULL DEFAULT '',
    department                VARCHAR(120) NOT NULL DEFAULT '',
    openings                  INTEGER NOT NULL DEFAULT 1 CHECK (openings BETWEEN 1 AND 999),
    employment_type           VARCHAR(20),
    workplace_type            VARCHAR(20),
    location                  VARCHAR(120) NOT NULL DEFAULT '',
    application_deadline      DATE,

    job_summary               VARCHAR(300) NOT NULL DEFAULT '',
    job_description           TEXT NOT NULL DEFAULT '',
    key_responsibilities      JSONB NOT NULL DEFAULT '[]',

    required_skills           JSONB NOT NULL DEFAULT '[]',
    preferred_skills          JSONB NOT NULL DEFAULT '[]',
    minimum_experience_years  INTEGER,
    education                 VARCHAR(120),
    certifications            JSONB NOT NULL DEFAULT '[]',
    language_requirements     JSONB NOT NULL DEFAULT '[]',
    other_requirements        VARCHAR(1000),

    salary_min                NUMERIC(14, 2),
    salary_max                NUMERIC(14, 2),
    currency                  VARCHAR(64),
    pay_period                VARCHAR(20),
    benefits                  JSONB NOT NULL DEFAULT '[]',

    working_days              JSONB NOT NULL DEFAULT '[]',
    working_hours             VARCHAR(60),
    shift_type                VARCHAR(20),
    expected_hours_per_week   NUMERIC(5, 2),

    assigned_recruiter_id     UUID REFERENCES users (id),
    hiring_manager_id         UUID REFERENCES users (id),
    recruitment_pipeline_id   VARCHAR(40),
    screening_questions       JSONB NOT NULL DEFAULT '[]',

    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at              TIMESTAMPTZ,
    closed_at                 TIMESTAMPTZ,
    archived_at               TIMESTAMPTZ
);

-- Every query is tenant-scoped; the list sorts newest first.
CREATE INDEX idx_job_vacancies_tenant_created ON job_vacancies (tenant_id, created_at DESC);
-- The public board reads published vacancies across tenants.
CREATE INDEX idx_job_vacancies_published ON job_vacancies (status, application_deadline)
    WHERE status = 'PUBLISHED';
```

JSONB for the string lists follows the reasoning in `V9__company_profile.sql`: they are always read and written
whole, and nothing else references them.

## 11. Example

`POST /api/v1/jobs`

```json
{
  "title": "Senior Backend Engineer",
  "department": "Engineering",
  "openings": 2,
  "employmentType": "FULL_TIME",
  "workplaceType": "HYBRID",
  "location": "Colombo, Sri Lanka",
  "applicationDeadline": "2026-10-30",
  "jobSummary": "Lead the services behind our candidate pipeline.",
  "jobDescription": "You will own…",
  "keyResponsibilities": ["Own the matching service"],
  "requiredSkills": ["Java", "Spring Boot"],
  "preferredSkills": [],
  "minimumExperienceYears": 4,
  "education": null,
  "certifications": [],
  "languageRequirements": ["English"],
  "otherRequirements": null,
  "salaryMin": 450000,
  "salaryMax": 650000,
  "currency": "LKR — Sri Lankan rupee",
  "payPeriod": "MONTHLY",
  "benefits": ["HEALTH_INSURANCE"],
  "workingDays": ["MON", "TUE", "WED", "THU", "FRI"],
  "workingHours": "9:00 AM – 6:00 PM",
  "shiftType": "DAY",
  "expectedHoursPerWeek": 40,
  "assignedRecruiterId": null,
  "hiringManagerId": null,
  "recruitmentPipelineId": "TECHNICAL",
  "screeningQuestions": ["Do you have the right to work in Sri Lanka?"],
  "status": "DRAFT"
}
```

`201 Created`: the same fields plus

```json
{
  "id": "8f0c2c1e-…",
  "version": 0,
  "status": "DRAFT",
  "createdAt": "2026-10-02T08:15:00Z",
  "updatedAt": "2026-10-02T08:15:00Z",
  "publishedAt": null,
  "closedAt": null,
  "archivedAt": null,
  "applicantCount": null
}
```

## 12. Tests worth writing on the backend

- Each role: admin and HR manager allowed; interviewer 403; no token 401.
- Cross-tenant `GET`, `PUT` and every move answer **404**, not 403.
- Each row of the §4 table: legal moves succeed and stamp their timestamp; illegal moves answer 422.
- Create as PUBLISHED with a missing field → 422 with a readable message; as DRAFT with the same body → 201.
- PUT with a stale `version` → 409; with the current one → 200 and `version + 1`.
- PUT on CLOSED → 422.
- Recruiter id from another tenant → 422.
- `GET /jobs` includes ARCHIVED, sorts newest first, and pages correctly at `size=100`.
- `GET /public/jobs` lists PUBLISHED only; a closed vacancy disappears from it.
- `applicantCount` is `null`.

## 13. Running both together

The Vite dev server proxies `/api` to `http://localhost:8080` (`vite.config.ts`), and nginx does the same in Docker,
so there is no CORS to configure. Start the backend on 8080, run `npm run dev` here, sign in as a company admin and
open **Job Vacancies**.
