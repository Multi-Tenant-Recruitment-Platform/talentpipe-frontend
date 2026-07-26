# Contributing to TalentPipe Frontend

## Branching model

We use a two-branch flow (GitFlow-lite):

```
master        ← production-ready, always releasable
development   ← integration branch, where features meet
feature/*     ← every task gets its own branch off development
```

- **Never commit directly to `master` or `development`** — both are protected.
- Branch off `development`: `git checkout -b feature/pb-012-job-board-ui development`
- Open a PR back into `development`. Releases are cut by PR'ing `development` → `master`.

## Pull request rules

| Target branch | Approvals required | Other gates |
|---|---|---|
| `master` | **2** | CI green, branch up to date, CODEOWNERS review |
| `development` | **1** | CI green, branch up to date |

- Fill in the PR template — reviewers reject empty descriptions.
- Keep PRs small and single-purpose.
- Resolve review comments by pushing new commits; don't force-push over a reviewed branch.
- The PR author merges after approval (squash merge preferred for feature PRs).

## Commit messages

Conventional-commit style:

```
feat(team): add role filter to members table
fix(auth): stop retrying refresh on 403
refactor(dashboard): extract funnel bar component
docs: update run instructions
chore/ci/style: ...
```

## Before you push

```bash
npm run build    # tsc strict type-check + vite build — same as CI
```

CI runs the exact same command on every PR — red CI means the PR cannot merge.

## Hard rules (project conventions)

1. All backend calls go through `src/api/` — pages never call axios directly.
2. Access tokens stay in memory (`tokenStore`), never in localStorage.
3. Tenant identity at login travels via the `X-Tenant-Subdomain` header only.
4. `mockDashboard.ts` is a stand-in — replace mock usage with real API calls as backend endpoints land; never build new features on mocks when the API exists.
5. No secrets in the repo. `VITE_*` env vars are build-time config, not a place for keys.
