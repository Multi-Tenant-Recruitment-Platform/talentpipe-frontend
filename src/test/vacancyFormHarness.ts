import { fireEvent, screen, within } from '@testing-library/react';
import { EMPTY_VACANCY_VALUES, type JobVacancyFormValues } from '../dashboard/jobVacancy';
import { NEW_VACANCY_DRAFT, vacancyDraftStore } from '../dashboard/vacancyDraftStore';
import { activeTenant, resetActiveTenantForTests } from '../tenant/activeTenant';

/**
 * Driving the step-by-step vacancy form in tests.
 *
 * <p>Next refuses to leave a step with missing answers, so reaching the sixth
 * step of a new vacancy means answering the first five. Typing forty answers
 * into antd's date and select widgets in every test would bury what the test
 * is about, so the form is opened the way a returning recruiter opens it: with
 * earlier work kept in this browser, resumed on the step it was left at.</p>
 */

/** Signs the tests into a workspace, so browser copies are kept; clears any left behind. */
export function enterDraftWorkspace(): void {
  localStorage.clear();
  resetActiveTenantForTests();
  activeTenant.set('t-test');
}

/** A new vacancy with every required answer of steps one to five, and no template yet. */
export function answeredValues(overrides: Partial<JobVacancyFormValues> = {}): JobVacancyFormValues {
  return {
    ...EMPTY_VACANCY_VALUES,
    title: 'Backend Engineer',
    department: 'Engineering',
    openings: 1,
    employmentType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    location: 'Colombo, Sri Lanka',
    applicationDeadline: '2099-01-31',
    jobSummary: 'Build the services behind our candidate pipeline.',
    jobDescription: 'A longer description of the role and the team it joins.',
    keyResponsibilities: ['Own the matching service'],
    requiredSkills: ['Java'],
    ...overrides,
  };
}

/** Leaves work in this browser, as if the form had been closed on `step`. */
export function leaveWork(
  step = 'pipeline',
  overrides: Partial<JobVacancyFormValues> = {},
  key: string = NEW_VACANCY_DRAFT,
): void {
  vacancyDraftStore.write(key, answeredValues(overrides), step);
}

/** Picks up the work {@link leaveWork} left. */
export async function resumeWork(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: /^resume$/i }));
}

export const stepper = () => screen.getByRole('navigation', { name: /vacancy form steps/i });

/** The stepper's button for a step, by its name. */
export const stepButton = (name: RegExp) => within(stepper()).getByRole('button', { name });

/** Opens a step from the stepper. */
export function openStep(name: RegExp): void {
  fireEvent.click(stepButton(name));
}

/** Presses Next. */
export function pressNext(): void {
  fireEvent.click(screen.getByRole('button', { name: /^next/i }));
}

/** The heading of the step that is open. */
export const openStepHeading = () => screen.getByRole('heading', { level: 2 });
