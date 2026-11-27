import { beforeEach, describe, expect, it } from 'vitest';
import { activeTenant, resetActiveTenantForTests } from '../tenant/activeTenant';
import { EMPTY_VACANCY_VALUES } from './jobVacancy';
import { NEW_VACANCY_DRAFT, vacancyDraftStore } from './vacancyDraftStore';

beforeEach(() => {
  localStorage.clear();
  resetActiveTenantForTests();
  activeTenant.set('t-1');
});

describe('the browser copy of a vacancy', () => {
  it('reads back what was written, with the step that was open', () => {
    const values = { ...EMPTY_VACANCY_VALUES, title: 'Backend Engineer' };
    vacancyDraftStore.write(NEW_VACANCY_DRAFT, values, 'requirements', new Date('2026-11-27T10:00:00Z'));

    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toEqual({
      values,
      step: 'requirements',
      savedAt: '2026-11-27T10:00:00.000Z',
    });
  });

  it('is kept per workspace', () => {
    vacancyDraftStore.write(NEW_VACANCY_DRAFT, EMPTY_VACANCY_VALUES, 'basics');
    expect(localStorage.getItem('talentpipe.tenant.t-1.vacancyDraft.new')).not.toBeNull();

    activeTenant.set('t-2');
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();
  });

  it('reads a damaged entry as nothing stored', () => {
    localStorage.setItem('talentpipe.tenant.t-1.vacancyDraft.new', '{not json');
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();

    localStorage.setItem('talentpipe.tenant.t-1.vacancyDraft.new', JSON.stringify({ step: 'basics' }));
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();
  });

  it('fills in fields added since it was written, and an unknown step opens the first', () => {
    localStorage.setItem(
      'talentpipe.tenant.t-1.vacancyDraft.new',
      JSON.stringify({ values: { title: 'Old copy' }, step: 'gone', savedAt: '2026-11-27T10:00:00Z' }),
    );

    const stored = vacancyDraftStore.read(NEW_VACANCY_DRAFT);
    expect(stored?.values).toEqual({ ...EMPTY_VACANCY_VALUES, title: 'Old copy' });
    expect(stored?.step).toBe('basics');
  });

  it('is forgotten on request', () => {
    vacancyDraftStore.write(NEW_VACANCY_DRAFT, EMPTY_VACANCY_VALUES, 'basics');
    vacancyDraftStore.clear(NEW_VACANCY_DRAFT);

    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();
  });
});
