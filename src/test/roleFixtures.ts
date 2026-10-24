import type { PermissionGroup, RoleResponse } from '../api/types';

/** The backend's permission catalogue, as `GET /permissions` returns it. */
export const CATALOGUE: PermissionGroup[] = [
  {
    key: 'TEAM',
    label: 'Team and access',
    permissions: [
      { key: 'team.view', label: 'View team', description: 'See the people in the workspace.', requires: [] },
      { key: 'team.invite', label: 'Invite people', description: 'Invite new members.', requires: ['team.view'] },
      { key: 'team.manage', label: 'Manage members', description: 'Change which role a member has.', requires: ['team.view'] },
      { key: 'roles.manage', label: 'Manage roles', description: 'Create, edit and delete roles.', requires: ['team.view'] },
    ],
  },
  {
    key: 'COMPANY',
    label: 'Company profile',
    permissions: [
      { key: 'settings.edit', label: 'Edit company profile', description: 'Change the company profile.', requires: [] },
    ],
  },
  {
    key: 'VACANCIES',
    label: 'Vacancies',
    permissions: [
      { key: 'jobs.view.all', label: 'See all vacancies', description: 'See every vacancy.', requires: [] },
      { key: 'jobs.manage', label: 'Create and edit vacancies', description: 'Create and edit vacancies.', requires: [] },
      { key: 'jobs.publish', label: 'Publish vacancies', description: 'Publish, close and archive.', requires: ['jobs.manage'] },
    ],
  },
  {
    key: 'HIRING',
    label: 'Applicants and pipelines',
    permissions: [
      { key: 'pipeline.templates.manage', label: 'Manage pipeline templates', description: 'Edit pipelines.', requires: [] },
      { key: 'applications.view.all', label: 'See all applicants', description: 'See every application.', requires: [] },
      { key: 'applications.manage', label: 'Move applicants', description: 'Move applicants on.', requires: [] },
    ],
  },
  {
    key: 'INTERVIEWS',
    label: 'Interviews',
    permissions: [
      { key: 'interviews.schedule', label: 'Organise interviews', description: 'Schedule interviews.', requires: [] },
      { key: 'interviews.conduct', label: 'Conduct interviews', description: 'Join interviews.', requires: [] },
    ],
  },
];

export const ALL_KEYS = CATALOGUE.flatMap((group) => group.permissions.map((permission) => permission.key));

const RECRUITER_KEYS = [
  'team.view',
  'settings.edit',
  'jobs.view.all',
  'jobs.manage',
  'jobs.publish',
  'applications.view.all',
  'applications.manage',
  'interviews.schedule',
  'interviews.conduct',
];

export function makeRole(overrides: Partial<RoleResponse> = {}): RoleResponse {
  return {
    id: 'r-custom',
    name: 'Hiring Coordinator',
    description: 'Organises interviews.',
    systemRole: null,
    locked: false,
    deletable: true,
    permissions: ['team.view', 'interviews.schedule', 'interviews.conduct'],
    memberCount: 0,
    version: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
    ...overrides,
  };
}

export const OWNER = makeRole({
  id: 'r-owner',
  name: 'Owner',
  description: 'Runs the workspace. Holds every permission, always.',
  systemRole: 'OWNER',
  locked: true,
  deletable: false,
  permissions: ALL_KEYS,
  memberCount: 1,
});

export const RECRUITER = makeRole({
  id: 'r-recruiter',
  name: 'Recruiter',
  description: 'Runs hiring day to day.',
  systemRole: 'RECRUITER',
  deletable: false,
  permissions: RECRUITER_KEYS,
  memberCount: 1,
});

export const INTERVIEWER = makeRole({
  id: 'r-interviewer',
  name: 'Interviewer',
  description: 'Interviews candidates.',
  systemRole: 'INTERVIEWER',
  deletable: false,
  permissions: ['interviews.conduct'],
  memberCount: 1,
});

export const COORDINATOR = makeRole({ memberCount: 2 });
