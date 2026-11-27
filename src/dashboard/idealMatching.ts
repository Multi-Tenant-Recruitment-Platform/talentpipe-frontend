import type {
  IdealMatchingRequest,
  IdealMatchingResponse,
  MatchingCategory,
  MatchingRequirement,
} from '../api/types';

/**
 * Ideal candidate matching, pure: what the person creating a vacancy says the
 * best applicant looks like, and how much each part counts.
 *
 * <p>Only skills carry a share of the 100%: the vacancy's required skills as
 * must-haves and its preferred skills as preferred — screening calls out a
 * missing must-have, the weight alone sets the score. Tools and technologies,
 * the minimum experience and education come straight from Candidate
 * requirements as context, like degree types and nice-to-have certifications,
 * and are never weighted.</p>
 *
 * <p>The rules mirror the server's (`IdealMatchingService`) word for word, so
 * the form catches a problem before Save and says it the same way.</p>
 */

/* --- State ---------------------------------------------------------------- */

/** One weighted row as the form holds it. */
export interface MatchingItemDraft {
  /** Stable React key; never sent. */
  key: string;
  category: MatchingCategory;
  name: string;
  /** Whole percent, 1–100; `null` until decided. */
  weight: number | null;
  requirement: MatchingRequirement;
}

export interface IdealMatchingDraft {
  enabled: boolean;
  items: MatchingItemDraft[];
  degreeTypes: string[];
  niceToHaveCertifications: string[];
}

/** What a new vacancy starts with: matching off, nothing weighted. */
export const EMPTY_MATCHING: IdealMatchingDraft = {
  enabled: false,
  items: [],
  degreeTypes: [],
  niceToHaveCertifications: [],
};

/** The education levels that are a degree; only these take accepted degree types. Same list as the server's. */
export const DEGREE_LEVELS = ['Diploma', 'Bachelor’s degree', 'Master’s degree', 'Doctorate'];

/** Offered while typing degree types; anything else can be typed too. */
export const DEGREE_TYPE_SUGGESTIONS = [
  'Computer Science',
  'Software Engineering',
  'Information Technology',
  'Information Systems',
  'Data Science',
  'Computer Engineering',
  'Electrical and Electronic Engineering',
  'Mathematics',
  'Statistics',
  'Business Administration',
];

export const REQUIREMENT_LABELS: Record<MatchingRequirement, string> = {
  MUST_HAVE: 'Must-have',
  PREFERRED: 'Preferred',
};

let nextKey = 0;
const newKey = () => `match-${++nextKey}`;

const folded = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** Whether two names count as the same criterion: the AI service ignores case. */
export const sameName = (a: string, b: string) => folded(a) === folded(b);

export const isDegreeLevel = (education: string) => DEGREE_LEVELS.includes(education.trim());

/** What the seed and the suggestions read from Candidate Requirements. */
export interface RequirementsSource {
  requiredSkills: string[];
  preferredSkills: string[];
  certifications: string[];
}

/* --- Building ------------------------------------------------------------- */

/** The one kind of criterion that is weighted. */
const SKILL: MatchingCategory = 'TECHNICAL_SKILL';

/** A new skill row; a skill typed in by hand starts as a must-have. */
export function newItem(name: string, requirement: MatchingRequirement = 'MUST_HAVE'): MatchingItemDraft {
  return {
    key: newKey(),
    category: SKILL,
    name: name.trim().replace(/\s+/g, ' '),
    weight: null,
    requirement,
  };
}

/** Candidate Requirements' skills, in order: required as must-haves, then preferred as preferred. */
function requirementSkills(source: RequirementsSource): { name: string; requirement: MatchingRequirement }[] {
  return [
    ...source.requiredSkills.map((name) => ({ name, requirement: 'MUST_HAVE' as const })),
    ...source.preferredSkills.map((name) => ({ name, requirement: 'PREFERRED' as const })),
  ];
}

/**
 * The rows Candidate Requirements already describe, so nobody types them twice:
 * every required skill as a must-have and every preferred skill as preferred.
 * A skill listed as both is used once, as the must-have.
 */
export function seedMatchingItems(source: RequirementsSource): MatchingItemDraft[] {
  const items: MatchingItemDraft[] = [];
  for (const { name, requirement } of requirementSkills(source)) {
    if (name.trim() !== '' && !items.some((item) => sameName(item.name, name))) {
      items.push(newItem(name, requirement));
    }
  }
  return items;
}

/** The first time matching is switched on: requirements loaded, certifications carried over. */
export function seedMatching(draft: IdealMatchingDraft, source: RequirementsSource): IdealMatchingDraft {
  return {
    ...draft,
    enabled: true,
    items: draft.items.length > 0 ? draft.items : seedMatchingItems(source),
    niceToHaveCertifications:
      draft.niceToHaveCertifications.length > 0 ? draft.niceToHaveCertifications : [...source.certifications],
  };
}

/**
 * Candidate Requirements' skills not weighted yet — added there after matching
 * was switched on — offered as one-click additions. A row the recruiter
 * removed comes back only if they add it.
 */
export function suggestionsFor(
  source: RequirementsSource,
  draft: IdealMatchingDraft,
): { name: string; requirement: MatchingRequirement }[] {
  const seen: string[] = [];
  return requirementSkills(source).filter(({ name }) => {
    const taken = draft.items.some((item) => sameName(item.name, name)) || seen.some((other) => sameName(other, name));
    seen.push(name);
    return name.trim() !== '' && !taken;
  });
}

/* --- Weights -------------------------------------------------------------- */

export function totalWeight(items: MatchingItemDraft[]): number {
  return items.reduce((sum, item) => sum + (item.weight ?? 0), 0);
}

/**
 * Shares 100% evenly across the rows, in whole percents that add up exactly:
 * the first rows take the remainder. Three rows become 34, 33, 33.
 */
export function evenOutWeights(items: MatchingItemDraft[]): MatchingItemDraft[] {
  if (items.length === 0) {
    return items;
  }
  const base = Math.floor(100 / items.length);
  const extra = 100 - base * items.length;
  return items.map((item, index) => ({ ...item, weight: Math.max(1, base + (index < extra ? 1 : 0)) }));
}

/* --- Rules ---------------------------------------------------------------- */

export interface MatchingProblems {
  /** One sentence for the whole profile, as the server says it; `null` when nothing is wrong. */
  summary: string | null;
  /** Per-row messages, by row key. */
  rows: Record<string, string>;
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * What is wrong with the profile. Some problems block every save — a skill
 * without a name, the same skill twice. Publishing a profile that is switched
 * on also needs a weighted skill, every skill weighted, and exactly 100%.
 */
export function matchingProblems(draft: IdealMatchingDraft, forPublish: boolean): MatchingProblems {
  const rows: Record<string, string> = {};
  const sentences: string[] = [];

  draft.items.forEach((item, index) => {
    if (item.name.trim() === '') {
      rows[item.key] = 'Give this a name or remove it.';
      return;
    }
    const earlier = draft.items.slice(0, index).find((other) => sameName(other.name, item.name));
    if (earlier) {
      rows[item.key] = `${item.name} is listed twice. Weigh each skill once.`;
    }
  });
  if (Object.keys(rows).length > 0) {
    sentences.push('Fix the ideal candidate rows marked below');
  }

  if (forPublish && draft.enabled) {
    if (draft.items.length === 0) {
      sentences.push('weigh at least one skill for the ideal candidate');
    }
    const unweighted = draft.items.filter((item) => item.weight === null);
    for (const item of unweighted) {
      rows[item.key] ??= `Give ${item.name} a weight or remove it.`;
    }
    if (unweighted.length > 0) {
      sentences.push(`give ${joinNames(unweighted.map((item) => item.name))} a weight or remove ${unweighted.length === 1 ? 'it' : 'them'}`);
    }
    const total = totalWeight(draft.items);
    if (draft.items.length > 0 && total !== 100) {
      sentences.push(`the ideal candidate weights add up to ${total}%; they need to total 100%`);
    }
  }

  if (sentences.length === 0) {
    return { summary: null, rows };
  }
  const [first, ...rest] = sentences;
  const sentence = [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join('; ');
  return { summary: `${sentence}.`, rows };
}

/* --- Wire ----------------------------------------------------------------- */

export function toMatchingRequest(draft: IdealMatchingDraft): IdealMatchingRequest {
  return {
    enabled: draft.enabled,
    criteria: draft.items.map((item) => ({
      category: SKILL,
      name: item.name.trim(),
      weightPercent: item.weight,
      requirement: item.requirement,
    })),
    degreeTypes: draft.degreeTypes,
    niceToHaveCertifications: draft.niceToHaveCertifications,
  };
}

export function toMatchingDraft(response: IdealMatchingResponse): IdealMatchingDraft {
  return {
    enabled: response.enabled,
    items: [...response.criteria]
      // Only skills are weighted; anything else an older answer carries is not shown or sent back.
      .filter((criterion) => criterion.category === SKILL)
      .sort((a, b) => a.position - b.position)
      .map((criterion) => ({
        key: newKey(),
        category: criterion.category,
        name: criterion.name,
        weight: criterion.weightPercent > 0 ? criterion.weightPercent : null,
        requirement: criterion.requirement,
      })),
    degreeTypes: [...response.degreeTypes],
    niceToHaveCertifications: [...response.niceToHaveCertifications],
  };
}

/** A comparable fingerprint, for the unsaved-changes check. Keys are not part of it. */
export function matchingKey(draft: IdealMatchingDraft | null): string {
  if (draft === null) {
    return 'none';
  }
  return JSON.stringify([
    draft.enabled,
    draft.items.map((item) => [item.category, folded(item.name), item.weight, item.requirement]),
    draft.degreeTypes,
    draft.niceToHaveCertifications,
  ]);
}
