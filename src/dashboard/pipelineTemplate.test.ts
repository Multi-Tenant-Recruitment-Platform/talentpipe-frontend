import { describe, expect, it } from 'vitest';
import type { PipelineTemplate } from '../api/types';
import {
  addRound,
  assertStageStructure,
  DEFAULT_AUTO_THRESHOLD,
  DEFAULT_MANUAL_THRESHOLD,
  describeScoreBands,
  emptyTemplateValues,
  firstInvalidField,
  isTemplateDirty,
  MAX_INTERVIEW_ROUNDS,
  MESSAGES,
  moveRound,
  parseServerFieldErrors,
  parseTemplateQuery,
  removeRound,
  renameRound,
  restoreRound,
  roundBenchmarkField,
  roundNameField,
  ruleMessageField,
  scoreBands,
  setRoundBenchmark,
  sortByUpdated,
  stageShape,
  toFormValues,
  toTemplateRequest,
  toTemplateSearchParams,
  validateTemplate,
  type TemplateFormValues,
} from './pipelineTemplate';

/** A template that passes every rule, with `rounds` interview rounds benchmarked at 70. */
function validValues(rounds = 1, overrides: Partial<TemplateFormValues> = {}): TemplateFormValues {
  let values = { ...emptyTemplateValues(), name: 'Engineering hiring' };
  for (let i = 1; i < rounds; i++) {
    values = addRound(values);
  }
  for (const round of values.rounds) {
    values = setRoundBenchmark(values, round.key, 70);
  }
  return { ...values, ...overrides };
}

const types = (values: TemplateFormValues) => toTemplateRequest(values).stages.map((stage) => stage.stageType);
const names = (values: TemplateFormValues) => values.rounds.map((round) => round.name);

describe('a new template', () => {
  it('starts as post application, screening, one interview round and onboard', () => {
    const values = emptyTemplateValues();
    expect(values.includeScreening).toBe(true);
    expect(names(values)).toEqual(['Interview round 1']);
    expect(types({ ...values, name: 'x' })).toEqual(['POST_APPLICATION', 'SCREENING', 'INTERVIEW', 'ONBOARD']);
  });

  it('pre-fills the thresholds at 80 and 70, with matching off', () => {
    const values = emptyTemplateValues();
    expect(values.autoThreshold).toBe(80);
    expect(values.manualThreshold).toBe(70);
    expect(values.idealMatchingEnabled).toBe(false);
  });

  it('leaves the benchmark empty, so the company sets it on purpose', () => {
    expect(emptyTemplateValues().rounds[0].benchmark).toBeNull();
  });
});

describe('validation', () => {
  it('accepts a complete template', () => {
    expect(validateTemplate(validValues())).toEqual({});
  });

  it.each([
    ['', MESSAGES.nameRequired],
    ['   ', MESSAGES.nameRequired],
    ['x'.repeat(121), MESSAGES.nameLength],
  ])('rejects the name %j', (name, message) => {
    expect(validateTemplate(validValues(1, { name })).name).toBe(message);
  });

  it('accepts any name the backend does: 1 to 120 characters', () => {
    expect(validateTemplate(validValues(1, { name: 'A' })).name).toBeUndefined();
    expect(validateTemplate(validValues(1, { name: 'x'.repeat(120) })).name).toBeUndefined();
  });

  it('flags a name already used by another active template, ignoring case and spaces', () => {
    expect(validateTemplate(validValues(1, { name: ' engineering HIRING ' }), ['Engineering hiring']).name).toBe(
      MESSAGES.nameTaken,
    );
  });

  it('caps the description at 1000 characters', () => {
    expect(validateTemplate(validValues(1, { description: 'x'.repeat(1000) })).description).toBeUndefined();
    expect(validateTemplate(validValues(1, { description: 'x'.repeat(1001) })).description).toBe(
      MESSAGES.descriptionLength,
    );
  });

  it('requires at least one interview round', () => {
    expect(validateTemplate(validValues(1, { rounds: [] })).rounds).toBe(MESSAGES.roundsMin);
  });

  it('requires every round to be named', () => {
    const values = validValues(2);
    const key = values.rounds[1].key;
    expect(validateTemplate(renameRound(values, key, '  '))[roundNameField(key)]).toBe(MESSAGES.roundNameRequired);
  });

  it('requires a benchmark on every round', () => {
    const values = validValues(2);
    const key = values.rounds[0].key;
    expect(validateTemplate(setRoundBenchmark(values, key, null))[roundBenchmarkField(key)]).toBe(
      MESSAGES.benchmarkRequired,
    );
  });

  it.each([0, 100, 65])('accepts the benchmark %d', (benchmark) => {
    const values = validValues();
    const key = values.rounds[0].key;
    expect(validateTemplate(setRoundBenchmark(values, key, benchmark))).toEqual({});
  });

  it.each([-1, 101, 7.5])('rejects the benchmark %d', (benchmark) => {
    const values = validValues();
    const key = values.rounds[0].key;
    expect(validateTemplate(setRoundBenchmark(values, key, benchmark))[roundBenchmarkField(key)]).toBe(
      MESSAGES.scoreRange,
    );
  });

  it('accepts a manual threshold one below the auto threshold', () => {
    expect(validateTemplate(validValues(1, { autoThreshold: 80, manualThreshold: 79 }))).toEqual({});
  });

  it('rejects a manual threshold equal to or above the auto threshold', () => {
    expect(validateTemplate(validValues(1, { autoThreshold: 80, manualThreshold: 80 })).manualThreshold).toBe(
      MESSAGES.thresholdOrder,
    );
    expect(validateTemplate(validValues(1, { autoThreshold: 60, manualThreshold: 70 })).manualThreshold).toBe(
      MESSAGES.thresholdOrder,
    );
  });

  it.each([-1, 101, 7.5, null])('rejects the threshold %s', (value) => {
    const errors = validateTemplate(validValues(1, { autoThreshold: value, manualThreshold: value }));
    expect(errors.autoThreshold).toBe(MESSAGES.scoreRange);
    expect(errors.manualThreshold).toBe(MESSAGES.scoreRange);
  });

  it('does not check thresholds while the pipeline has no screening', () => {
    expect(
      validateTemplate(validValues(1, { includeScreening: false, autoThreshold: 50, manualThreshold: 90 })),
    ).toEqual({});
  });

  it('points at the first problem in on-screen order', () => {
    const values = validValues(2, { name: '', manualThreshold: 95 });
    const withGap = setRoundBenchmark(values, values.rounds[1].key, null);
    const errors = validateTemplate(withGap);
    expect(firstInvalidField(withGap, errors)).toBe('name');
    expect(firstInvalidField(withGap, { ...errors, name: undefined })).toBe(
      roundBenchmarkField(withGap.rounds[1].key),
    );
  });
});

describe('the stage builder', () => {
  it('adds rounds up to the limit and no further', () => {
    let values = validValues();
    for (let i = 0; i < 20; i++) {
      values = addRound(values);
    }
    expect(values.rounds).toHaveLength(MAX_INTERVIEW_ROUNDS);
    expect(values.rounds[9].name).toBe('Interview round 10');
  });

  it('will not remove the last interview round', () => {
    const values = validValues();
    const result = removeRound(values, values.rounds[0].key);
    expect(result.removed).toBeNull();
    expect(result.values.rounds).toHaveLength(1);
  });

  it('renumbers default names after a removal, and restores the round in place on undo', () => {
    const values = validValues(3);
    const middle = values.rounds[1];
    const { values: after, removed } = removeRound(values, middle.key);
    expect(names(after)).toEqual(['Interview round 1', 'Interview round 2']);

    const restored = restoreRound(after, removed!);
    expect(restored.rounds.map((round) => round.key)).toEqual(values.rounds.map((round) => round.key));
    expect(names(restored)).toEqual(['Interview round 1', 'Interview round 2', 'Interview round 3']);
  });

  it('keeps a name the admin typed when rounds move', () => {
    const values = validValues(2);
    const named = renameRound(values, values.rounds[1].key, 'Panel interview');
    const moved = moveRound(named, named.rounds[1].key, 'up');
    expect(names(moved)).toEqual(['Panel interview', 'Interview round 2']);
  });

  it('never moves a round past either end', () => {
    const values = validValues(2);
    expect(moveRound(values, values.rounds[0].key, 'up')).toBe(values);
    expect(moveRound(values, values.rounds[1].key, 'down')).toBe(values);
  });

  it('keeps post application first and onboard last through any sequence of moves', () => {
    let values = validValues(4);
    const keys = values.rounds.map((round) => round.key);
    for (const [i, direction] of (['up', 'down', 'up', 'up', 'down', 'up'] as const).entries()) {
      values = moveRound(values, keys[i % keys.length], direction);
      for (const screening of [true, false]) {
        const stages = types({ ...values, includeScreening: screening });
        expect(stages[0]).toBe('POST_APPLICATION');
        expect(stages[stages.length - 1]).toBe('ONBOARD');
      }
    }
  });
});

describe('the request', () => {
  it('numbers positions from 0 in screen order, with benchmarks only on interview rounds', () => {
    const values = validValues(2, { description: '  For engineers  ' });
    const request = toTemplateRequest(setRoundBenchmark(values, values.rounds[1].key, 65));
    expect(request.stages).toEqual([
      { stageType: 'POST_APPLICATION', name: 'Post application', benchmark: null, position: 0 },
      { stageType: 'SCREENING', name: 'Screening', benchmark: null, position: 1 },
      { stageType: 'INTERVIEW', name: 'Interview round 1', benchmark: 70, position: 2 },
      { stageType: 'INTERVIEW', name: 'Interview round 2', benchmark: 65, position: 3 },
      { stageType: 'ONBOARD', name: 'Onboard', benchmark: null, position: 4 },
    ]);
    expect(request.description).toBe('For engineers');
    expect(request.defaultAutoThreshold).toBe(80);
    expect(request.defaultManualThreshold).toBe(70);
  });

  it('leaves screening out when it is removed', () => {
    expect(types(validValues(1, { includeScreening: false }))).toEqual(['POST_APPLICATION', 'INTERVIEW', 'ONBOARD']);
  });

  it('keeps the last valid thresholds while screening is off', () => {
    const request = toTemplateRequest(
      validValues(1, { includeScreening: false, autoThreshold: 50, manualThreshold: 90 }),
    );
    expect(request.defaultAutoThreshold).toBe(DEFAULT_AUTO_THRESHOLD);
    expect(request.defaultManualThreshold).toBe(DEFAULT_MANUAL_THRESHOLD);
  });

  it('sends an empty description as null', () => {
    expect(toTemplateRequest(validValues(1, { description: '   ' })).description).toBeNull();
  });

  it('refuses stage lists that break the template shape', () => {
    const ok = [
      { stageType: 'POST_APPLICATION' as const, position: 0 },
      { stageType: 'INTERVIEW' as const, position: 1 },
      { stageType: 'ONBOARD' as const, position: 2 },
    ];
    expect(() => assertStageStructure(ok)).not.toThrow();
    expect(() => assertStageStructure([...ok].reverse())).toThrow(/first/);
    expect(() => assertStageStructure(ok.map((stage, i) => ({ ...stage, position: i + 1 })))).toThrow(/consecutive/);
    expect(() =>
      assertStageStructure([
        ok[0],
        { stageType: 'SCREENING', position: 1 },
        { stageType: 'SCREENING', position: 2 },
        { ...ok[2], position: 3 },
      ]),
    ).toThrow(/screening/);
  });
});

describe('opening a saved template', () => {
  const saved: PipelineTemplate = {
    id: 't1',
    name: 'Graduate intake',
    description: null,
    defaultAutoThreshold: 75,
    defaultManualThreshold: 60,
    idealMatchingEnabled: true,
    status: 'ACTIVE',
    // Deliberately out of order: the server's list order is not trusted.
    stageCount: 4,
    interviewRoundCount: 2,
    stages: [
      { id: 's3', position: 2, stageType: 'INTERVIEW', name: 'Panel', benchmark: 65 },
      { id: 's1', position: 0, stageType: 'POST_APPLICATION', name: 'Post application', benchmark: null },
      { id: 's4', position: 3, stageType: 'ONBOARD', name: 'Onboard', benchmark: null },
      { id: 's2', position: 1, stageType: 'INTERVIEW', name: 'Interview round 1', benchmark: 50 },
    ],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    archivedAt: null,
  };

  it('reads the stages back in order, as form values', () => {
    const values = toFormValues(saved);
    expect(values.includeScreening).toBe(false);
    expect(values.rounds.map(({ name, benchmark, customName }) => ({ name, benchmark, customName }))).toEqual([
      { name: 'Interview round 1', benchmark: 50, customName: false },
      { name: 'Panel', benchmark: 65, customName: true },
    ]);
    expect(values.description).toBe('');
    expect([values.autoThreshold, values.manualThreshold, values.idealMatchingEnabled]).toEqual([75, 60, true]);
  });

  it('is not dirty until something changes', () => {
    const values = toFormValues(saved);
    const reopened = toFormValues(saved);
    expect(isTemplateDirty(values, reopened)).toBe(false);
    expect(isTemplateDirty({ ...values, name: 'Graduate intake ' }, reopened)).toBe(false);
    expect(isTemplateDirty({ ...values, idealMatchingEnabled: false }, reopened)).toBe(true);
  });

  it('describes its shape from stages or from bare counts', () => {
    expect(stageShape(saved)).toEqual({ includeScreening: false, interviewRounds: 2, stageCount: 4 });
    expect(stageShape({ stageCount: 5, interviewRoundCount: 2 })).toEqual({
      includeScreening: true,
      interviewRounds: 2,
      stageCount: 5,
    });
  });
});

describe('server validation errors', () => {
  it('lands each message on the field it names', () => {
    const values = validValues(2);
    const { errors, rest } = parseServerFieldErrors(
      'name: must be unique; stages[3].benchmark: must be at most 100; defaultManualThreshold: too high; tenant: nope',
      values,
    );
    expect(errors.name).toBe('must be unique');
    expect(errors[roundBenchmarkField(values.rounds[1].key)]).toBe('must be at most 100');
    expect(errors.manualThreshold).toBe('too high');
    expect(rest).toEqual(['tenant: nope']);
  });

  it('accounts for a missing screening stage when mapping stage indexes', () => {
    const values = validValues(1, { includeScreening: false });
    const { errors } = parseServerFieldErrors('stages[1].name: must not be blank', values);
    expect(errors[roundNameField(values.rounds[0].key)]).toBe('must not be blank');
  });
});

describe('backend rule refusals', () => {
  it('puts the ones about a single field on that field', () => {
    expect(ruleMessageField('Manual threshold must be lower than auto threshold')).toEqual({
      field: 'manualThreshold',
      text: MESSAGES.thresholdOrder,
    });
    expect(ruleMessageField('Template name cannot be empty')?.field).toBe('name');
    expect(ruleMessageField('At least one interview round is required')?.field).toBe('rounds');
  });

  it('leaves the rest for the form-level alert', () => {
    expect(ruleMessageField('Cannot edit an archived pipeline template')).toBeNull();
  });
});

describe('score bands', () => {
  it('splits 0–100 with ≥ at both thresholds', () => {
    expect(scoreBands(80, 70)).toEqual([
      { id: 'reject', label: 'Rejected', from: 0, to: 69 },
      { id: 'manual', label: 'Manual review', from: 70, to: 79 },
      { id: 'auto', label: 'Auto-advance', from: 80, to: 100 },
    ]);
  });

  it('says the rule in a sentence', () => {
    expect(describeScoreBands(80, 70)).toBe(
      'Scores 80 and above advance automatically, 70 to 79 go to manual review, and below 70 are rejected.',
    );
    expect(describeScoreBands(80, 0)).toBe('Scores 80 and above advance automatically, and 0 to 79 go to manual review.');
  });
});

describe('the list query', () => {
  it('round-trips through the address bar', () => {
    const query = { q: 'eng', archived: true };
    expect(parseTemplateQuery(toTemplateSearchParams(query))).toEqual(query);
    expect(toTemplateSearchParams({ q: '', archived: false }).toString()).toBe('');
  });

  it('puts the most recently updated first', () => {
    const rows = [
      { id: 'a', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'b', updatedAt: '2026-03-01T00:00:00Z' },
    ];
    expect(sortByUpdated(rows).map((row) => row.id)).toEqual(['b', 'a']);
  });
});
