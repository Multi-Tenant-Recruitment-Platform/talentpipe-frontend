import type {
  PipelineStage,
  PipelineStageRequest,
  PipelineStageType,
  PipelineTemplate,
  PipelineTemplateRequest,
  PipelineTemplateSummary,
} from '../api/types';

/**
 * Pipeline templates — the rules, the form model and the wire mapping
 * (sprint "Pipeline template creation", PT-1 → PT-9).
 *
 * <p>Pure functions only, so every rule is testable without rendering a form.
 * The screens read from here and the backend validates the same rules again.</p>
 *
 * <p>The form does not hold a list of stages. It holds the parts an admin can
 * actually change — whether screening is included, and the interview rounds in
 * order — and the mapper builds the stage list from those. That makes the
 * structural rules (post application first, onboard last, positions
 * consecutive) impossible to break from the UI rather than merely checked.</p>
 */

/* --- Assumptions for the spec's open items ---------------------------------
 * Each is one constant, so a decision from the product owner is a one-line
 * change here and nowhere else.
 */

/** Open item 1: screening can be left out — some jobs only need interviews. */
export const SCREENING_OPTIONAL = true;
/** Open item 2: a template needs at least one interview round. */
export const MIN_INTERVIEW_ROUNDS = 1;
/** Beyond this a pipeline has stopped being a template anyone can follow. */
export const MAX_INTERVIEW_ROUNDS = 10;
/** Open item 3: benchmarks and thresholds are whole numbers on a 0–100 scale. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const DEFAULT_AUTO_THRESHOLD = 80;
export const DEFAULT_MANUAL_THRESHOLD = 70;

/** Column sizes from migration V14 — the backend's @Size limits. */
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 1000;
export const ROUND_NAME_MAX = 100;

/** What each stage kind is called wherever it is shown. */
export const STAGE_LABEL: Record<Exclude<PipelineStageType, 'INTERVIEW'>, string> = {
  POST_APPLICATION: 'Post application',
  SCREENING: 'Screening',
  ONBOARD: 'Onboard',
};

/** What each kind of stage does, in a sentence. Shared by the builder and the read-only view. */
export const STAGE_HELP: Record<PipelineStageType, string> = {
  POST_APPLICATION: 'Candidates enter here when they apply.',
  SCREENING: 'AI scores each CV against the job. The thresholds below decide who moves on.',
  INTERVIEW: 'Interviewer scores below this reject the candidate.',
  ONBOARD: 'Reaching this stage marks the candidate as hired.',
};

/** The validation copy, word for word, so tests and screens can't drift apart. */
export const MESSAGES = {
  nameRequired: 'Enter a template name.',
  nameLength: `Keep the name under ${NAME_MAX} characters.`,
  nameTaken: 'A template with this name already exists.',
  descriptionLength: `Keep the description under ${DESCRIPTION_MAX} characters.`,
  roundsMin: 'Add at least one interview round.',
  roundNameRequired: 'Name this interview round.',
  roundNameLength: `Keep the round name under ${ROUND_NAME_MAX} characters.`,
  benchmarkRequired: 'Set a benchmark for this round.',
  scoreRange: 'Enter a whole number from 0 to 100.',
  thresholdOrder: 'Manual-review threshold must be lower than the auto-advance threshold.',
} as const;

/* --- Form model ------------------------------------------------------------ */

export interface InterviewRoundDraft {
  /** Stable across reorders, so React keeps each row's input and focus. */
  key: string;
  name: string;
  benchmark: number | null;
  /**
   * False while the name is still the "Interview round N" default. Defaults
   * renumber as rounds move; a name the admin typed never changes under them.
   */
  customName: boolean;
}

export interface TemplateFormValues {
  name: string;
  description: string;
  includeScreening: boolean;
  rounds: InterviewRoundDraft[];
  autoThreshold: number | null;
  manualThreshold: number | null;
  idealMatchingEnabled: boolean;
}

let roundSequence = 0;
const nextRoundKey = () => `round-${++roundSequence}`;

export const defaultRoundName = (position: number) => `Interview round ${position}`;

/** Re-applies "Interview round N" to every round still using a default name. */
export function renumberDefaults(rounds: InterviewRoundDraft[]): InterviewRoundDraft[] {
  return rounds.map((round, i) =>
    round.customName ? round : { ...round, name: defaultRoundName(i + 1) },
  );
}

function newRound(position: number): InterviewRoundDraft {
  return { key: nextRoundKey(), name: defaultRoundName(position), benchmark: null, customName: false };
}

/**
 * A new template: the full four-stage shape with the spec's default
 * thresholds. A function, not a constant, so each form gets fresh round keys.
 */
export function emptyTemplateValues(): TemplateFormValues {
  return {
    name: '',
    description: '',
    includeScreening: true,
    rounds: [newRound(1)],
    autoThreshold: DEFAULT_AUTO_THRESHOLD,
    manualThreshold: DEFAULT_MANUAL_THRESHOLD,
    idealMatchingEnabled: false,
  };
}

/* --- Stage builder moves --------------------------------------------------- */

export function addRound(values: TemplateFormValues): TemplateFormValues {
  if (values.rounds.length >= MAX_INTERVIEW_ROUNDS) {
    return values;
  }
  return { ...values, rounds: [...values.rounds, newRound(values.rounds.length + 1)] };
}

export interface RemovedRound {
  round: InterviewRoundDraft;
  index: number;
}

/** Removes a round, unless it is the last one a template may not lose. */
export function removeRound(
  values: TemplateFormValues,
  key: string,
): { values: TemplateFormValues; removed: RemovedRound | null } {
  const index = values.rounds.findIndex((round) => round.key === key);
  if (index === -1 || values.rounds.length <= MIN_INTERVIEW_ROUNDS) {
    return { values, removed: null };
  }
  const rounds = values.rounds.filter((round) => round.key !== key);
  return {
    values: { ...values, rounds: renumberDefaults(rounds) },
    removed: { round: values.rounds[index], index },
  };
}

/** Undo for {@link removeRound}: the round goes back where it was. */
export function restoreRound(values: TemplateFormValues, removed: RemovedRound): TemplateFormValues {
  if (values.rounds.length >= MAX_INTERVIEW_ROUNDS || values.rounds.some((r) => r.key === removed.round.key)) {
    return values;
  }
  const rounds = [...values.rounds];
  rounds.splice(Math.min(removed.index, rounds.length), 0, removed.round);
  return { ...values, rounds: renumberDefaults(rounds) };
}

/**
 * Moves a round one place. Only interview rounds move, and only among
 * themselves: post application, screening and onboard are pinned, so no
 * sequence of moves can displace them.
 */
export function moveRound(
  values: TemplateFormValues,
  key: string,
  direction: 'up' | 'down',
): TemplateFormValues {
  const from = values.rounds.findIndex((round) => round.key === key);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= values.rounds.length) {
    return values;
  }
  const rounds = [...values.rounds];
  [rounds[from], rounds[to]] = [rounds[to], rounds[from]];
  return { ...values, rounds: renumberDefaults(rounds) };
}

export function renameRound(values: TemplateFormValues, key: string, name: string): TemplateFormValues {
  return {
    ...values,
    rounds: values.rounds.map((round) => (round.key === key ? { ...round, name, customName: true } : round)),
  };
}

export function setRoundBenchmark(
  values: TemplateFormValues,
  key: string,
  benchmark: number | null,
): TemplateFormValues {
  return {
    ...values,
    rounds: values.rounds.map((round) => (round.key === key ? { ...round, benchmark } : round)),
  };
}

/* --- Validation ------------------------------------------------------------ */

export const roundNameField = (key: string) => `round:${key}:name`;
export const roundBenchmarkField = (key: string) => `round:${key}:benchmark`;

/**
 * Every field key the form can flag. Round fields carry the round's key, so an
 * error follows its row when the rounds are reordered.
 */
export type TemplateField =
  | 'name'
  | 'description'
  | 'rounds'
  | 'autoThreshold'
  | 'manualThreshold'
  | ReturnType<typeof roundNameField>
  | ReturnType<typeof roundBenchmarkField>;

export type TemplateErrors = Partial<Record<TemplateField, string>>;

/** A whole number on the score scale. */
export function isValidScore(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

const normaliseName = (name: string) => name.trim().toLowerCase();

/** Thresholds only mean something while the pipeline screens applicants. */
const thresholdsApply = (values: TemplateFormValues) => values.includeScreening;

/**
 * Every rule, in the order the fields appear on screen.
 *
 * @param takenNames the names of the company's other ACTIVE templates (open
 *   item 5: an archived template's name can be reused). Compared without case
 *   or surrounding space. The server's 409 stays the authority.
 */
export function validateTemplate(
  values: TemplateFormValues,
  takenNames: readonly string[] = [],
): TemplateErrors {
  const errors: TemplateErrors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = MESSAGES.nameRequired;
  } else if (name.length > NAME_MAX) {
    errors.name = MESSAGES.nameLength;
  } else if (takenNames.some((taken) => normaliseName(taken) === normaliseName(name))) {
    errors.name = MESSAGES.nameTaken;
  }

  if (values.description.trim().length > DESCRIPTION_MAX) {
    errors.description = MESSAGES.descriptionLength;
  }

  if (values.rounds.length < MIN_INTERVIEW_ROUNDS) {
    errors.rounds = MESSAGES.roundsMin;
  }

  for (const round of values.rounds) {
    const roundName = round.name.trim();
    if (!roundName) {
      errors[roundNameField(round.key)] = MESSAGES.roundNameRequired;
    } else if (roundName.length > ROUND_NAME_MAX) {
      errors[roundNameField(round.key)] = MESSAGES.roundNameLength;
    }
    if (round.benchmark === null) {
      errors[roundBenchmarkField(round.key)] = MESSAGES.benchmarkRequired;
    } else if (!isValidScore(round.benchmark)) {
      errors[roundBenchmarkField(round.key)] = MESSAGES.scoreRange;
    }
  }

  if (thresholdsApply(values)) {
    const { autoThreshold: auto, manualThreshold: manual } = values;
    if (!isValidScore(auto)) {
      errors.autoThreshold = MESSAGES.scoreRange;
    }
    if (!isValidScore(manual)) {
      errors.manualThreshold = MESSAGES.scoreRange;
    } else if (isValidScore(auto) && manual >= auto) {
      errors.manualThreshold = MESSAGES.thresholdOrder;
    }
  }

  return errors;
}

/** Field keys in on-screen order — where "fix the first issue" lands. */
export function fieldOrder(values: TemplateFormValues): TemplateField[] {
  return [
    'name',
    'description',
    'rounds',
    ...values.rounds.flatMap((round) => [roundNameField(round.key), roundBenchmarkField(round.key)]),
    'autoThreshold',
    'manualThreshold',
  ];
}

export function firstInvalidField(values: TemplateFormValues, errors: TemplateErrors): TemplateField | null {
  return fieldOrder(values).find((field) => errors[field]) ?? null;
}

/* --- Wire mapping ---------------------------------------------------------- */

/**
 * Throws if a stage list breaks the template's shape. The builder cannot
 * produce such a list; this guards the mapper against a future change that
 * could, before the request leaves the browser.
 */
export function assertStageStructure(stages: readonly Pick<PipelineStage, 'stageType' | 'position'>[]): void {
  const fail = (why: string) => {
    throw new Error(`Invalid pipeline template stages: ${why}`);
  };
  if (stages[0]?.stageType !== 'POST_APPLICATION') {
    fail('post application must be first');
  }
  if (stages[stages.length - 1]?.stageType !== 'ONBOARD') {
    fail('onboard must be last');
  }
  if (stages.filter((stage) => stage.stageType === 'POST_APPLICATION').length !== 1) {
    fail('exactly one post application stage');
  }
  if (stages.filter((stage) => stage.stageType === 'ONBOARD').length !== 1) {
    fail('exactly one onboard stage');
  }
  if (stages.filter((stage) => stage.stageType === 'SCREENING').length > 1) {
    fail('at most one screening stage');
  }
  stages.forEach((stage, i) => {
    if (stage.position !== i) {
      fail('positions must be consecutive from 0');
    }
  });
}

/** Thresholds kept while screening is off: the last valid pair, else the defaults. */
function storedThresholds(values: TemplateFormValues): { auto: number; manual: number } {
  const { autoThreshold: auto, manualThreshold: manual } = values;
  if (isValidScore(auto) && isValidScore(manual) && manual < auto) {
    return { auto, manual };
  }
  return { auto: DEFAULT_AUTO_THRESHOLD, manual: DEFAULT_MANUAL_THRESHOLD };
}

/** The form, as the backend receives it. Positions come from the order on screen. */
export function toTemplateRequest(values: TemplateFormValues): PipelineTemplateRequest {
  const stages: Omit<PipelineStageRequest, 'position'>[] = [
    { stageType: 'POST_APPLICATION', name: STAGE_LABEL.POST_APPLICATION, benchmark: null },
    ...(values.includeScreening
      ? [{ stageType: 'SCREENING' as const, name: STAGE_LABEL.SCREENING, benchmark: null }]
      : []),
    ...values.rounds.map((round) => ({
      stageType: 'INTERVIEW' as const,
      name: round.name.trim(),
      benchmark: round.benchmark,
    })),
    { stageType: 'ONBOARD', name: STAGE_LABEL.ONBOARD, benchmark: null },
  ];
  // 0-based: the backend's validator requires positions 0, 1, 2, …
  const positioned = stages.map((stage, i) => ({ ...stage, position: i }));
  assertStageStructure(positioned);

  // While screening is off the thresholds are not on screen to correct, so a
  // half-typed pair is replaced by the last valid one rather than blocking Save.
  const thresholds = values.includeScreening
    ? { auto: values.autoThreshold ?? DEFAULT_AUTO_THRESHOLD, manual: values.manualThreshold ?? DEFAULT_MANUAL_THRESHOLD }
    : storedThresholds(values);

  const description = values.description.trim();
  return {
    name: values.name.trim(),
    description: description || null,
    defaultAutoThreshold: thresholds.auto,
    defaultManualThreshold: thresholds.manual,
    idealMatchingEnabled: values.idealMatchingEnabled,
    stages: positioned,
  };
}

/** Stages in pipeline order, whatever order the server listed them in. */
export const orderedStages = (stages: readonly PipelineStage[]) =>
  [...stages].sort((a, b) => a.position - b.position);

/** A saved template, opened for editing. */
export function toFormValues(template: PipelineTemplate): TemplateFormValues {
  const stages = orderedStages(template.stages);
  const interviews = stages.filter((stage) => stage.stageType === 'INTERVIEW');
  return {
    name: template.name,
    description: template.description ?? '',
    includeScreening: stages.some((stage) => stage.stageType === 'SCREENING'),
    rounds: interviews.map((stage, i) => ({
      key: nextRoundKey(),
      name: stage.name,
      benchmark: stage.benchmark,
      customName: stage.name !== defaultRoundName(i + 1),
    })),
    autoThreshold: template.defaultAutoThreshold,
    manualThreshold: template.defaultManualThreshold,
    idealMatchingEnabled: template.idealMatchingEnabled,
  };
}

/** True when saving would change something. Round keys are identity, not content. */
export function isTemplateDirty(values: TemplateFormValues, baseline: TemplateFormValues): boolean {
  const comparable = (v: TemplateFormValues) =>
    JSON.stringify({
      ...v,
      name: v.name.trim(),
      description: v.description.trim(),
      rounds: v.rounds.map(({ name, benchmark }) => ({ name: name.trim(), benchmark })),
    });
  return comparable(values) !== comparable(baseline);
}

/* --- Server field errors --------------------------------------------------- */

const SERVER_FIELD: Record<string, TemplateField> = {
  name: 'name',
  description: 'description',
  defaultAutoThreshold: 'autoThreshold',
  defaultManualThreshold: 'manualThreshold',
};

/**
 * Spreads a 400's message across the fields it names.
 *
 * <p>The backend's validation handler joins field errors as
 * `"stages[3].benchmark: must be ≤ 100; name: must not be blank"`. Stage
 * indexes are positions in the request we sent, so they map back to rounds
 * through the same order {@link toTemplateRequest} used. Anything that names
 * no known field comes back in `rest` for the form-level alert.</p>
 */
export function parseServerFieldErrors(
  message: string,
  values: TemplateFormValues,
): { errors: TemplateErrors; rest: string[] } {
  const errors: TemplateErrors = {};
  const rest: string[] = [];
  const firstRoundIndex = values.includeScreening ? 2 : 1;

  for (const part of message.split(';').map((p) => p.trim()).filter(Boolean)) {
    const match = /^([\w.[\]]+):\s*(.+)$/.exec(part);
    if (!match) {
      rest.push(part);
      continue;
    }
    const [, path, text] = match;
    const stage = /^stages\[(\d+)]\.(name|benchmark)$/.exec(path);
    if (stage) {
      const round = values.rounds[Number(stage[1]) - firstRoundIndex];
      if (round) {
        errors[stage[2] === 'name' ? roundNameField(round.key) : roundBenchmarkField(round.key)] = text;
        continue;
      }
    }
    const field = SERVER_FIELD[path];
    if (field) {
      errors[field] = text;
    } else {
      rest.push(part);
    }
  }
  return { errors, rest };
}

/**
 * The backend's single-sentence rule refusals (422, and the 400 for a blank
 * name) that belong to one field. Matched loosely, so a reworded message
 * falls back to the form-level alert rather than to the wrong field.
 */
const RULE_FIELDS: { pattern: RegExp; field: TemplateField; text: string }[] = [
  { pattern: /manual threshold must be lower/i, field: 'manualThreshold', text: MESSAGES.thresholdOrder },
  { pattern: /template name cannot be empty/i, field: 'name', text: MESSAGES.nameRequired },
  { pattern: /at least one interview round/i, field: 'rounds', text: MESSAGES.roundsMin },
];

/** The field a backend rule message is about, or null when it names none. */
export function ruleMessageField(message: string): { field: TemplateField; text: string } | null {
  const hit = RULE_FIELDS.find(({ pattern }) => pattern.test(message));
  return hit ? { field: hit.field, text: hit.text } : null;
}

/* --- Score bands ----------------------------------------------------------- */

export interface ScoreBand {
  id: 'reject' | 'manual' | 'auto';
  label: string;
  /** Inclusive range on the 0–100 scale; empty when `from > to`. */
  from: number;
  to: number;
}

/**
 * The screening rule as three ranges, compared with ≥ as the spec decides:
 * exactly the auto threshold advances, exactly the manual threshold waits.
 */
export function scoreBands(auto: number, manual: number): ScoreBand[] {
  return [
    { id: 'reject', label: 'Rejected', from: SCORE_MIN, to: manual - 1 },
    { id: 'manual', label: 'Manual review', from: manual, to: auto - 1 },
    { id: 'auto', label: 'Auto-advance', from: auto, to: SCORE_MAX },
  ];
}

/** The rule in one sentence, for screen readers and the detail page. */
export function describeScoreBands(auto: number, manual: number): string {
  const manualTop = auto - 1;
  const manualRange = manual === manualTop ? `${manual}` : `${manual} to ${manualTop}`;
  const parts = [
    `Scores ${auto} and above advance automatically`,
    `${manualRange} go${manual === manualTop ? 'es' : ''} to manual review`,
  ];
  if (manual > SCORE_MIN) {
    parts.push(`below ${manual} are rejected`);
  }
  return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ', and ' : ''}${parts[parts.length - 1]}.`;
}

/* --- Shape at a glance ----------------------------------------------------- */

export interface StageShape {
  includeScreening: boolean;
  interviewRounds: number;
  stageCount: number;
}

/** What the list row's stage strip needs, from full stages or bare counts. */
export function stageShape(
  template: Partial<Pick<PipelineTemplateSummary, 'stageCount' | 'interviewRoundCount'>> & {
    stages?: readonly PipelineStage[];
  },
): StageShape {
  if (template.stages && template.stages.length > 0) {
    return {
      includeScreening: template.stages.some((stage) => stage.stageType === 'SCREENING'),
      interviewRounds: template.stages.filter((stage) => stage.stageType === 'INTERVIEW').length,
      stageCount: template.stages.length,
    };
  }
  // Post application and onboard are always there; whatever is left over
  // beside the interview rounds is screening.
  const stageCount = template.stageCount ?? 0;
  const interviewRounds = template.interviewRoundCount ?? 0;
  return { includeScreening: stageCount - interviewRounds - 2 > 0, interviewRounds, stageCount };
}

/* --- List query ------------------------------------------------------------ */

export interface TemplateQuery {
  q: string;
  archived: boolean;
}

export function parseTemplateQuery(params: URLSearchParams): TemplateQuery {
  return { q: params.get('q') ?? '', archived: params.get('archived') === '1' };
}

export function toTemplateSearchParams(query: TemplateQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) {
    params.set('q', query.q);
  }
  if (query.archived) {
    params.set('archived', '1');
  }
  return params;
}

/** Most recently changed first — the template being worked on is the one wanted next. */
export function sortByUpdated<T extends { updatedAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
