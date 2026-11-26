import { describe, expect, it } from 'vitest';
import type { InterviewPanelResponse, MemberSummary } from '../api/types';
import {
  creatorLabel,
  duplicatePanels,
  EMPTY_VACANCY_VALUES,
  isVacancyDirty,
  panelDraftsFor,
  panelProblem,
  toVacancyRequest,
  toVacancyUpdate,
  validatePipeline,
  validateVacancy,
  type InterviewPanelDraft,
} from './jobVacancy';

/** The rules for interview panels, pure: what a draft may hold, what publishing needs, what is sent. */

const person = (id: string, status = 'ACTIVE'): MemberSummary => ({
  id,
  firstName: id,
  lastName: 'Member',
  email: `${id}@acme.test`,
  roleName: 'Interviewer',
  status,
});

const panel = (interviewerCount: number | null, people: string[]): InterviewPanelDraft => ({
  stagePosition: 2,
  stageName: 'Technical interview',
  interviewerCount,
  interviewers: people.map((id) => person(id)),
});

describe('panelProblem', () => {
  it('lets a draft be short, but not publishing', () => {
    expect(panelProblem(panel(3, ['a']), false)).toBeNull();
    expect(panelProblem(panel(3, ['a']), true)).toBe('Technical interview needs 3 interviewers, 1 chosen');
    expect(panelProblem(panel(null, []), false)).toBeNull();
    expect(panelProblem(panel(null, []), true)).toBe('Technical interview needs its interviewers');
  });

  it('refuses more people than the number, or people before a number, in every state', () => {
    for (const forPublish of [false, true]) {
      expect(panelProblem(panel(1, ['a', 'b']), forPublish)).toBe(
        'Technical interview has 2 interviewers but needs only 1. Remove some or raise the number.',
      );
      expect(panelProblem(panel(null, ['a']), forPublish)).toBe(
        'Set how many interviewers Technical interview needs before choosing them.',
      );
    }
  });

  it('is satisfied by exactly the number asked for', () => {
    expect(panelProblem(panel(2, ['a', 'b']), true)).toBeNull();
  });
});

describe('panel validation in the form', () => {
  const withPanels = (panels: InterviewPanelDraft[] | null) => ({ ...EMPTY_VACANCY_VALUES, interviewPanels: panels });

  it('holds Publish to complete rounds, joining them as the server does', () => {
    const values = withPanels([panel(2, ['a']), { ...panel(null, []), stagePosition: 3, stageName: 'Final round' }]);

    expect(validateVacancy(values).interviewPanels).toBe(
      'Technical interview needs 2 interviewers, 1 chosen; Final round needs its interviewers.',
    );
  });

  it('holds a draft only to what no state allows', () => {
    expect(validatePipeline(withPanels([panel(3, ['a'])]), 'edit-draft').interviewPanels).toBeUndefined();
    expect(validatePipeline(withPanels([panel(1, ['a', 'b'])]), 'edit-draft').interviewPanels).toMatch(
      /needs only 1/,
    );
  });

  it('checks nothing while the rounds are unknown', () => {
    expect(validateVacancy(withPanels(null)).interviewPanels).toBeUndefined();
  });
});

describe('panels on the wire', () => {
  const values = { ...EMPTY_VACANCY_VALUES, pipelineTemplateId: 'tpl-1', interviewPanels: [panel(2, ['a', 'b'])] };

  it('sends each round by position, with the chosen people’s ids', () => {
    expect(toVacancyRequest(values, 'DRAFT').interviewPanels).toEqual([
      { stagePosition: 2, interviewerCount: 2, interviewerIds: ['a', 'b'] },
    ]);
    expect(toVacancyUpdate(values, 4).interviewPanels).toEqual([
      { stagePosition: 2, interviewerCount: 2, interviewerIds: ['a', 'b'] },
    ]);
  });

  it('sends nothing when the rounds were never read, so the server keeps what it has', () => {
    expect(toVacancyUpdate({ ...values, interviewPanels: null }, 4).interviewPanels).toBeNull();
  });

  it('calls a changed panel an unsaved change, and an untouched one not', () => {
    expect(isVacancyDirty(values, values)).toBe(false);
    expect(isVacancyDirty({ ...values, interviewPanels: [panel(2, ['a'])] }, values)).toBe(true);
    expect(isVacancyDirty({ ...values, interviewPanels: [panel(3, ['a', 'b'])] }, values)).toBe(true);
  });
});

describe('panelDraftsFor', () => {
  const stages = [
    { position: 0, stageType: 'POST_APPLICATION', name: 'Applied' },
    { position: 3, stageType: 'INTERVIEW', name: 'Final round' },
    { position: 2, stageType: 'INTERVIEW', name: 'Technical interview' },
    { position: 4, stageType: 'ONBOARD', name: 'Onboard' },
  ];

  it('makes one empty panel per interview round, in pipeline order', () => {
    expect(panelDraftsFor(stages, null)).toEqual([
      { stagePosition: 2, stageName: 'Technical interview', interviewerCount: null, interviewers: [] },
      { stagePosition: 3, stageName: 'Final round', interviewerCount: null, interviewers: [] },
    ]);
  });

  it('keeps a panel already put together for the same round', () => {
    const drafts = panelDraftsFor(stages, [panel(2, ['a'])]);
    expect(drafts[0].interviewers.map((p) => p.id)).toEqual(['a']);
    expect(drafts[1].interviewerCount).toBeNull();
  });
});

describe('duplicatePanels', () => {
  it('copies the original’s panels without anyone who can no longer sit on one', () => {
    const stored: InterviewPanelResponse[] = [
      {
        stageId: 's-2',
        position: 2,
        name: 'Technical interview',
        benchmark: 70,
        interviewerCount: 2,
        interviewers: [person('a'), person('gone', 'DISABLED')],
      },
    ];

    expect(duplicatePanels(stored)).toEqual([
      { stagePosition: 2, stageName: 'Technical interview', interviewerCount: 2, interviewers: [person('a')] },
    ]);
  });
});

describe('creatorLabel', () => {
  it('says "You" to the creator, and the server’s name to everyone else', () => {
    const vacancy = { createdBy: 'u-3', createdByName: 'Amaya Perera' };
    expect(creatorLabel(vacancy, 'u-3')).toBe('You');
    expect(creatorLabel(vacancy, 'u-1')).toBe('Amaya Perera');
  });

  it('says nothing when nobody is recorded', () => {
    expect(creatorLabel({ createdBy: null, createdByName: null }, 'u-1')).toBeNull();
    expect(creatorLabel({ createdBy: 'u-gone', createdByName: null }, 'u-1')).toBeNull();
  });
});
