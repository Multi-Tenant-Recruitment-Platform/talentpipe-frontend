import type { UserResponse } from '../api/types';
import { makeUser } from './authHarness';

/**
 * The demo workspace's members as `/auth/me` really returns them: role,
 * roleName and permissions copied from a backend started with the `demo`
 * profile. They cover the three default roles and two custom ones, so the
 * access tests below check what each kind of member actually gets, not what a
 * hand-made fixture says they should.
 */
function member(role: string, roleName: string, permissions: string[]): UserResponse {
  return makeUser({ role, roleName, permissions, tenantId: 't-lumora', tenantName: 'Lumora' });
}

export const DEMO_OWNER = member('COMPANY_ADMIN', 'Owner', [
  'team.view',
  'team.invite',
  'team.manage',
  'roles.manage',
  'settings.edit',
  'jobs.view.all',
  'jobs.manage',
  'jobs.publish',
  'pipeline.templates.manage',
  'applications.view.all',
  'applications.manage',
  'interviews.schedule',
  'interviews.conduct',
]);

export const DEMO_RECRUITER = member('HR_MANAGER', 'Recruiter', [
  'jobs.view.all',
  'jobs.manage',
  'jobs.publish',
  'applications.view.all',
  'applications.manage',
  'interviews.schedule',
]);

export const DEMO_INTERVIEWER = member('INTERVIEWER', 'Interviewer', ['interviews.conduct']);

/** A custom role: runs the team and the interview schedule, sees every applicant. */
export const DEMO_COORDINATOR = member('CUSTOM', 'Hiring Coordinator', [
  'team.view',
  'team.invite',
  'applications.view.all',
  'interviews.schedule',
]);

/** A custom role: opens and staffs their own vacancies and moves those applicants. */
export const DEMO_JUNIOR_RECRUITER = member('CUSTOM', 'Junior Recruiter', ['jobs.manage', 'applications.manage']);

export const DEMO_CANDIDATE = makeUser({
  role: 'CANDIDATE',
  roleName: 'Candidate',
  permissions: [],
  tenantId: null,
  tenantName: null,
});

export const DEMO_MEMBERS = {
  Owner: DEMO_OWNER,
  Recruiter: DEMO_RECRUITER,
  Interviewer: DEMO_INTERVIEWER,
  'Hiring Coordinator': DEMO_COORDINATOR,
  'Junior Recruiter': DEMO_JUNIOR_RECRUITER,
} as const;

export type DemoMemberName = keyof typeof DEMO_MEMBERS;
