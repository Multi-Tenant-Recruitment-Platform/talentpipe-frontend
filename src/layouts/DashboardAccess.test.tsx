import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { can, type Permission } from '../auth/permissions';
import { authContextMock, setAuth } from '../test/authHarness';
import { makeCompanyProfile } from '../test/companyFixtures';
import { DEMO_MEMBERS, type DemoMemberName } from '../test/demoMembers';

/**
 * Which parts of the company workspace each kind of member can open, checked
 * against the demo workspace's real members (`test/demoMembers.ts`).
 *
 * <p>Two things are pinned: which permission guards each dashboard route in
 * App.tsx, read from the source so a route cannot quietly change guard, and
 * which sidebar entries each member is shown. Together they say who reaches
 * which page; the backend still refuses anything this lets through by
 * mistake.</p>
 */

vi.mock('../auth/AuthContext', () => authContextMock);
vi.mock('../api/company', () => ({
  companyApi: { get: vi.fn(() => Promise.resolve(makeCompanyProfile())), settings: vi.fn() },
}));
const teamList = vi.fn(() => Promise.resolve([]));
vi.mock('../api/team', () => ({ teamApi: { list: teamList } }));

const { DashboardLayout } = await import('./DashboardLayout');

afterEach(cleanup);

// --------------------------------------------------------------------- routes

/** Every dashboard route and the permission App.tsx guards it with. */
const ROUTE_GUARDS: Record<string, Permission> = {
  '': 'overview.view',
  team: 'team.view',
  'team/roles': 'roles.view',
  'team/roles/new': 'roles.manage',
  'team/roles/:id': 'roles.view',
  'team/activity': 'roles.manage',
  pipeline: 'pipeline.view',
  jobs: 'jobs.view',
  'jobs/new': 'jobs.manage',
  'jobs/:id': 'jobs.view',
  'jobs/:id/edit': 'jobs.manage',
  'pipeline-templates': 'templates.view',
  'pipeline-templates/new': 'templates.manage',
  'pipeline-templates/:id': 'templates.view',
  'pipeline-templates/:id/edit': 'templates.manage',
  profile: 'company.profile.view',
  'profile/edit': 'settings.edit',
  settings: 'settings.view',
};

/** The routes each member may open; every other dashboard route is a 403 for them. */
const OPENS: Record<DemoMemberName, string[]> = {
  Owner: Object.keys(ROUTE_GUARDS),
  Recruiter: [
    '',
    'pipeline',
    'jobs',
    'jobs/new',
    'jobs/:id',
    'jobs/:id/edit',
    'pipeline-templates',
    'pipeline-templates/:id',
    'profile',
  ],
  Interviewer: ['', 'jobs', 'jobs/:id', 'profile'],
  'Hiring Coordinator': ['', 'team', 'team/roles', 'team/roles/:id', 'pipeline', 'jobs', 'jobs/:id', 'profile'],
  'Junior Recruiter': [
    '',
    'jobs',
    'jobs/new',
    'jobs/:id',
    'jobs/:id/edit',
    'pipeline-templates',
    'pipeline-templates/:id',
    'profile',
  ],
};

/** `path` → `permission` for each `<RequirePermission>` route under /dashboard in App.tsx. */
function guardsInAppSource(): Record<string, string> {
  const source = readFileSync('src/App.tsx', 'utf8');
  const dashboard = source.slice(source.indexOf('path="/dashboard"'));
  const guards: Record<string, string> = {};
  const route = /<Route\s+(?:path="([^"]+)"|index)\s+element=\{\s*<RequirePermission permission="([^"]+)">/g;
  for (const [, path, permission] of dashboard.matchAll(route)) {
    guards[path ?? ''] = permission;
  }
  return guards;
}

describe('dashboard routes', () => {
  it('are each guarded by the permission this table expects', () => {
    expect(guardsInAppSource()).toEqual(ROUTE_GUARDS);
  });

  it.each(Object.keys(OPENS) as DemoMemberName[])('open to the %s exactly where expected', (name) => {
    const user = DEMO_MEMBERS[name];
    const opened = Object.entries(ROUTE_GUARDS)
      .filter(([, permission]) => can(user, permission))
      .map(([path]) => path);
    expect(opened.sort()).toEqual([...OPENS[name]].sort());
  });

  it('keep every admin page from the Recruiter', () => {
    const recruiter = DEMO_MEMBERS.Recruiter;
    for (const path of ['team', 'team/roles', 'team/activity', 'settings', 'profile/edit', 'pipeline-templates/new']) {
      expect(can(recruiter, ROUTE_GUARDS[path]), path).toBe(false);
    }
  });
});

// -------------------------------------------------------------------- sidebar

const NAV: Record<DemoMemberName, string[]> = {
  Owner: [
    'Overview',
    'Job Vacancies',
    'Pipeline Templates',
    'Pipeline',
    'Team',
    'Profile Management',
    'Company Settings',
  ],
  Recruiter: ['Overview', 'Job Vacancies', 'Pipeline Templates', 'Pipeline', 'Profile Management'],
  Interviewer: ['Overview', 'Job Vacancies', 'Profile Management'],
  'Hiring Coordinator': ['Overview', 'Job Vacancies', 'Pipeline', 'Team', 'Profile Management'],
  'Junior Recruiter': ['Overview', 'Job Vacancies', 'Pipeline Templates', 'Profile Management'],
};

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('the sidebar', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(Object.keys(NAV) as DemoMemberName[])('shows the %s only what they may open', async (name) => {
    setAuth({ user: DEMO_MEMBERS[name], initializing: false });
    renderLayout();

    const [primary] = await screen.findAllByRole('menu');
    expect(within(primary).getAllByRole('link').map((link) => link.textContent)).toEqual(NAV[name]);
  });

  it('only loads the team for a member who may see it', async () => {
    setAuth({ user: DEMO_MEMBERS.Recruiter, initializing: false });
    renderLayout();
    await screen.findAllByRole('menu');
    expect(teamList).not.toHaveBeenCalled();

    cleanup();
    setAuth({ user: DEMO_MEMBERS['Hiring Coordinator'], initializing: false });
    renderLayout();
    await waitFor(() => expect(teamList).toHaveBeenCalled());
  });
});
