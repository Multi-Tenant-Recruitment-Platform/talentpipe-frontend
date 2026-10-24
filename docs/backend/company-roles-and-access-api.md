# Company roles, access and hiring settings — backend contract

**For:** anyone changing the backend endpoints these screens call, or the screens themselves.
**Backend:** PR #21 on `Multi-Tenant-Recruitment-Platform` (`feature/review-and-refine-existing-features`):
ADR-9 (company roles), ADR-11 (vacancy hiring team), ADR-13 / PB-015 (feature switches), PB-017 (public board filters).
**Status:** implemented on both sides. The client half is in the files named under each section; if anything here
changes, change it there too, in the same PR pair.

---

## 1. Errors

Every error answers the standard envelope, now with a stable `code` the UI branches on instead of the wording:

```json
{
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "Enter a valid email address, like you@company.com.",
  "fieldErrors": [{ "field": "admin.email", "message": "Enter a valid email address, like you@company.com." }],
  "details": null
}
```

| Code | Status | What the UI does |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Each `fieldErrors[].message` goes under its field (sign-up strips the `admin.` prefix). |
| `INVALID_TOKEN` | 401 | Workspace choice expired or reused: back to the sign-in form with the email kept. |
| `ACCOUNT_NOT_VERIFIED` | 403 | Offers a new verification link. `INVITATION_NOT_ACCEPTED` and `ACCOUNT_LOCKED` do not. |
| `CONFLICT` | 409 | A role name or candidate email is taken: shown on that field. |
| `CONCURRENT_UPDATE` | 409 | A role was saved by someone else first: the editor offers their version. |
| `WORKSPACE_SELECTION_REQUIRED` | 409 | Sign-in turns into the account list (§2). |
| `BUSINESS_RULE` | 422 | `message` is written for people and shown as it comes. |

Client: [`src/api/errors.ts`](../../src/api/errors.ts) reads `code`, `fieldErrors` and `details`.

## 2. Signing in to one of several accounts

`POST /auth/login` with an email and password that fit more than one account (two companies, or a company member who
is also a candidate) answers **409 `WORKSPACE_SELECTION_REQUIRED`** with:

```json
"details": {
  "selectionToken": "…",
  "expiresInSeconds": 120,
  "accounts": [
    { "accountId": "…", "type": "COMPANY", "workspaceName": "Acme", "subdomain": "acme", "logoUrl": null, "roleName": "Recruiter" },
    { "accountId": "…", "type": "CANDIDATE", "roleName": "Candidate" }
  ]
}
```

`POST /auth/login/select { "selectionToken", "accountId" }` finishes the sign-in with the same body `/auth/login` returns.
The token is single-use; a used or expired one answers 401 `INVALID_TOKEN`.

Client: [`LoginForm.tsx`](../../src/components/auth/LoginForm.tsx), [`WorkspacePicker.tsx`](../../src/components/auth/WorkspacePicker.tsx),
`selectWorkspace` in [`AuthContext.tsx`](../../src/auth/AuthContext.tsx).

## 3. Company roles and permissions

A role is a named set of permissions. Every workspace has **Owner** (locked: always every permission), **Recruiter** and
**Interviewer**, and up to **50** roles of its own. A signed-in company member's `UserResponse` carries `roleId`,
`roleName` and `permissions` (the keys below).

| Method | Path | Needs | Notes |
|---|---|---|---|
| GET | `/permissions` | any member | The catalogue, grouped: `[{ key, label, permissions: [{ key, label, description, requires }] }]` |
| GET | `/roles` | `team.view` | Owner, Recruiter, Interviewer, then custom roles by name. |
| GET | `/roles/{id}` | `team.view` | |
| POST | `/roles` | `roles.manage` | `{ name ≤ 60, description ≤ 300, permissions }` → 201. 409 name taken; 422 over the limit. |
| PUT | `/roles/{id}` | `roles.manage` | Same body plus `version`. 409 `CONCURRENT_UPDATE` when stale; 422 for Owner. |
| POST | `/roles/{id}/duplicate` | `roles.manage` | A custom copy named "… (copy)". |
| DELETE | `/roles/{id}?reassignTo=` | `roles.manage` | Custom roles only. Its members move to `reassignTo` in the same transaction; 422 without it when anyone holds the role. |
| GET | `/roles/audit?page&size` | `roles.manage` | Newest first, `size` ≤ 100. |

Rules the server enforces and the editor shows before Save:

- **Requirements travel with what needs them.** A permission's `requires` are granted with it (`team.invite` brings
  `team.view`). The editor ticks and locks them, naming what holds them there.
- **Nobody hands out what they do not hold.** Creating, editing (both the old and the new set), deleting or assigning a
  role whose permissions the caller lacks answers 422. The editor locks those permissions, and opens such a role read-only.
- **Owner is for Owners.** Only an Owner makes someone an Owner or changes an Owner's role; the last active Owner
  cannot be moved off it. Nobody is invited as Owner.

Audit entries: `{ action: ROLE_CREATED | ROLE_UPDATED | ROLE_DELETED | MEMBER_ROLE_CHANGED, actorUserId, roleId,
roleName, targetUserId, previousValue, newValue, occurredAt }`. For a role, `previousValue`/`newValue` are snapshots
`"Name: key, key"` (or `"Name: (no permissions)"`); the activity page diffs them into renames and added/removed
permissions. For a member move they are the role names.

How permission keys open screens (the UI never grants more than these):

| Backend key | UI permissions | Opens |
|---|---|---|
| *(any company member)* | `dashboard.view`, `jobs.view`, `settings.view`, … | the workspace, the vacancies they work on |
| `team.view` | `team.view`, `roles.view` | Team › Members, Roles (read-only) |
| `team.invite` | `team.invite`, `team.invite.manage` | Invite, resend, revoke |
| `team.manage` | `team.manage` | Change a member's role |
| `roles.manage` | `roles.manage` | Create/edit/delete roles, Team › Activity |
| `settings.edit` | `settings.edit`, `billing.view` | Edit the company profile and switches |
| `jobs.view.all` | `jobs.viewAll` | Every vacancy, and "Only mine" |
| `jobs.manage` / `jobs.publish` | same | Vacancy writes / lifecycle |
| `applications.manage` | `pipeline.manage` | Moving applicants |

Pipeline templates still check the fixed role on the backend, so the UI does too. A server that sends no
`permissions` (older than company roles) gets the fixed role matrix.

Client: [`src/api/roles.ts`](../../src/api/roles.ts), [`src/auth/permissions.ts`](../../src/auth/permissions.ts),
[`src/dashboard/roleEditor.ts`](../../src/dashboard/roleEditor.ts), the pages under `src/pages/dashboard/Role*`.

## 4. Team

- `GET /team` (`team.view`) → `TeamMemberResponse[]`: a `UserResponse` without `permissions`, plus
  `invitationSentAt` and `invitationExpiresAt`.
- `POST /team/invitations` (`team.invite`) takes `roleId` (any role but Owner). The old `role: HR_MANAGER | INTERVIEWER`
  still works when `roleId` is absent.
- `PUT /team/members/{id}/role { roleId }` (`team.manage`) moves a member or a pending invitee. 422 for the Owner rules above.

Client: [`src/api/team.ts`](../../src/api/team.ts), [`TeamPage.tsx`](../../src/pages/dashboard/TeamPage.tsx).

## 5. Vacancies: who works on them, AI switches, industry

- `GET /jobs?assignedTo=me|{userId}&department=&status=` — without `jobs.view.all`, the server lists only the vacancies
  the caller works on (created, recruits for, manages, or on the hiring team of).
- `GET /jobs/{id}/hiring-team` (any member who can see it) → `{ vacancyId, recruiter, hiringManager, members[] }`, each a
  `MemberSummary { id, firstName, lastName, email, roleName, status }`.
- `PUT /jobs/{id}/hiring-team { memberIds }` (`jobs.manage`) replaces the team (≤ 50). 422 when archived or someone
  added is not an active member. Recruiter and hiring manager are set by the vacancy form, not here.
- `PATCH /jobs/{id}/features { aiScreeningEnabled?, candidateMatchingEnabled? }` (`jobs.manage`) — a switch left out
  keeps its value; 422 once closed. A new vacancy starts with the company defaults (§6).
- `industry` on the vacancy must be one of the company's industries (main + up to 3 more); blank means the main one for
  a new vacancy, and "keep" for an edit. A company with no industry files vacancies with none.

Client: [`src/api/jobs.ts`](../../src/api/jobs.ts), [`HiringTeamCard.tsx`](../../src/components/jobs/HiringTeamCard.tsx),
[`VacancyFeaturesCard.tsx`](../../src/components/jobs/VacancyFeaturesCard.tsx).

## 6. Company profile and switches

- `PATCH /tenant` accepts `additionalIndustries` (≤ 3, from the same list as `industry`, never the main one).
- `GET /tenant/settings` (any member) → `{ blindScreeningEnabled, aiScreeningDefault, candidateMatchingDefault, updatedAt }`.
- `PATCH /tenant/settings` (`settings.edit`) — a switch left out keeps its value; 422 while the company is suspended.

Client: [`src/api/company.ts`](../../src/api/company.ts), [`HiringSettingsCard.tsx`](../../src/components/dashboard/HiringSettingsCard.tsx).

## 7. Public job board

`GET /public/jobs` searches every published vacancy; all parameters are optional and combine with AND:

| Parameter | Meaning |
|---|---|
| `q`, `location` | Words in the title, skills, summary or description; part of the location. |
| `industry` | One industry label. |
| `employmentType`, `workplaceType` | Comma-separated enum values; any of them. |
| `minExperience`, `maxExperience` | Bounds on the years a vacancy asks for (none stated counts as 0). |
| `salaryOnly` | Only vacancies that state pay. |
| `payPeriod`, `currency`, `salaryMin`, `salaryMax` | Stated pay overlapping the range. A range needs `payPeriod` (400 otherwise). |
| `sort` | `relevant` (default) or `newest`. |

`GET /public/jobs/filters` → `{ categories, locations, industries, employmentTypes, workplaceTypes, salaryRanges }`:
values with at least one published vacancy, `{ value, count }` most populated first; `salaryRanges` is
`{ payPeriod, currency, min, max, count }` per period and currency. Counts describe the whole board.

Client: [`src/api/publicJobs.ts`](../../src/api/publicJobs.ts); `toBoardParams` in
[`src/jobs/jobFilters.ts`](../../src/jobs/jobFilters.ts) is the single place filters become parameters.

## 8. Sign-up

Field paths in `fieldErrors`: company sign-up `companyName`, `admin.firstName`, `admin.lastName`, `admin.email`,
`admin.password`; candidate sign-up `fullName`, `identityCardNumber` (≤ 20, `200012345678` or `912345678V`), `address`,
`contactNumber`, `email`, `password`. A candidate email that already has an account answers 409.
