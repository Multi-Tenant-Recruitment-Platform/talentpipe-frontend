import { describe, expect, it } from 'vitest';
import type { IdealMatchingResponse } from '../api/types';
import {
  EMPTY_MATCHING,
  evenOutWeights,
  isDegreeLevel,
  matchingKey,
  matchingProblems,
  newItem,
  seedMatching,
  seedMatchingItems,
  suggestionsFor,
  toMatchingDraft,
  toMatchingRequest,
  totalWeight,
  type IdealMatchingDraft,
  type RequirementsSource,
} from './idealMatching';

/** The ideal candidate's rules, pure: seeding, the 100%, problems, and the wire shape. */

const source: RequirementsSource = {
  requiredSkills: ['Java', 'Spring Boot'],
  preferredSkills: ['Kafka', 'java'],
  certifications: ['AWS Solutions Architect'],
};

const withWeights = (draft: IdealMatchingDraft, weights: (number | null)[]) => ({
  ...draft,
  items: draft.items.map((item, index) => ({ ...item, weight: weights[index] ?? null })),
});

describe('seeding from Candidate requirements', () => {
  it('weighs skills only: required skills as must-haves, then preferred skills as preferred', () => {
    const items = seedMatchingItems(source);

    expect(items.map((item) => [item.category, item.name, item.requirement])).toEqual([
      ['TECHNICAL_SKILL', 'Java', 'MUST_HAVE'],
      ['TECHNICAL_SKILL', 'Spring Boot', 'MUST_HAVE'],
      // "java" is already in as a required skill; the AI service ignores case, so it is used once.
      ['TECHNICAL_SKILL', 'Kafka', 'PREFERRED'],
    ]);
    expect(items.every((item) => item.weight === null)).toBe(true);
  });

  it('switching on the first time fills rows and certifications; switching on again keeps what is there', () => {
    const first = seedMatching(EMPTY_MATCHING, source);
    expect(first.enabled).toBe(true);
    expect(first.items).toHaveLength(3);
    expect(first.niceToHaveCertifications).toEqual(['AWS Solutions Architect']);

    const trimmed = { ...first, enabled: false, items: first.items.slice(0, 1) };
    expect(seedMatching(trimmed, source).items).toHaveLength(1);
  });

  it('suggests requirement skills not weighted yet, so a removed row stays removed until added', () => {
    const draft = { ...EMPTY_MATCHING, enabled: true, items: [newItem('Java')] };

    expect(suggestionsFor(source, draft)).toEqual([
      { name: 'Spring Boot', requirement: 'MUST_HAVE' },
      { name: 'Kafka', requirement: 'PREFERRED' },
    ]);
  });

  it('starts a skill typed in by hand as a must-have', () => {
    expect(newItem('  Spring   Boot ')).toMatchObject({ category: 'TECHNICAL_SKILL', name: 'Spring Boot', requirement: 'MUST_HAVE' });
    expect(newItem('Kafka', 'PREFERRED').requirement).toBe('PREFERRED');
  });
});

describe('the 100%', () => {
  it('evens out to whole percents that add up exactly', () => {
    const three = { ...EMPTY_MATCHING, items: [newItem('a'), newItem('b'), newItem('c')] };
    const even = evenOutWeights(three.items);

    expect(even.map((item) => item.weight)).toEqual([34, 33, 33]);
    expect(totalWeight(even)).toBe(100);
  });

  it('counts unweighted rows as nothing', () => {
    const draft = withWeights({ ...EMPTY_MATCHING, items: [newItem('a'), newItem('b')] }, [40, null]);
    expect(totalWeight(draft.items)).toBe(40);
  });
});

describe('matchingProblems', () => {
  const two = { ...EMPTY_MATCHING, enabled: true, items: [newItem('Java'), newItem('Kafka', 'PREFERRED')] };

  it('lets a draft be short of 100% or unweighted', () => {
    expect(matchingProblems(withWeights(two, [50, null]), false).summary).toBeNull();
  });

  it('holds Publish to exactly 100% with every row weighted, in the server’s words', () => {
    expect(matchingProblems(withWeights(two, [50, 35]), true).summary).toBe(
      'The ideal candidate weights add up to 85%; they need to total 100%.',
    );
    const unweighted = matchingProblems(withWeights(two, [100, null]), true);
    expect(unweighted.summary).toBe('Give Kafka a weight or remove it.');
    expect(unweighted.rows[two.items[1].key]).toBe('Give Kafka a weight or remove it.');
    expect(matchingProblems(withWeights(two, [60, 40]), true).summary).toBeNull();
  });

  it('asks nothing of Publish while matching is off', () => {
    expect(matchingProblems({ ...withWeights(two, [10, null]), enabled: false }, true).summary).toBeNull();
  });

  it('refuses the same skill twice, ignoring case, in every state', () => {
    const twice = { ...EMPTY_MATCHING, items: [newItem('Git'), newItem('git', 'PREFERRED')] };
    const problems = matchingProblems(twice, false);

    expect(problems.summary).toBe('Fix the ideal candidate rows marked below.');
    expect(problems.rows[twice.items[1].key]).toBe('git is listed twice. Weigh each skill once.');
  });

  it('needs at least one weighted skill to publish', () => {
    expect(matchingProblems({ ...EMPTY_MATCHING, enabled: true }, true).summary).toBe(
      'Weigh at least one skill for the ideal candidate.',
    );
  });
});

describe('wire shape', () => {
  it('sends the skills in order with whole percents and must-have or preferred', () => {
    const draft = withWeights(
      {
        enabled: true,
        items: [newItem('Java'), newItem('Kafka', 'PREFERRED')],
        degreeTypes: ['Computer Science'],
        niceToHaveCertifications: ['CKA'],
      },
      [70, 30],
    );

    expect(toMatchingRequest(draft)).toEqual({
      enabled: true,
      criteria: [
        { category: 'TECHNICAL_SKILL', name: 'Java', weightPercent: 70, requirement: 'MUST_HAVE' },
        { category: 'TECHNICAL_SKILL', name: 'Kafka', weightPercent: 30, requirement: 'PREFERRED' },
      ],
      degreeTypes: ['Computer Science'],
      niceToHaveCertifications: ['CKA'],
    });
  });

  it('reads a stored profile back in position order, an undecided weight as empty', () => {
    const response: IdealMatchingResponse = {
      available: true,
      enabled: true,
      criteria: [
        { id: 'c2', category: 'TECHNICAL_SKILL', name: 'Kafka', weightPercent: 0, requirement: 'PREFERRED', position: 1 },
        { id: 'c1', category: 'TECHNICAL_SKILL', name: 'Java', weightPercent: 60, requirement: 'MUST_HAVE', position: 0 },
      ],
      totalWeightPercent: 60,
      degreeTypes: [],
      niceToHaveCertifications: [],
    };

    const draft = toMatchingDraft(response);
    expect(draft.items.map((item) => [item.name, item.weight])).toEqual([
      ['Java', 60],
      ['Kafka', null],
    ]);
  });

  it('calls a changed profile an unsaved change, and the same profile with new keys not', () => {
    const draft = withWeights({ ...EMPTY_MATCHING, enabled: true, items: [newItem('Java')] }, [100]);
    const reloaded = { ...draft, items: draft.items.map((item) => ({ ...item, key: 'other' })) };

    expect(matchingKey(reloaded)).toBe(matchingKey(draft));
    expect(matchingKey(withWeights(draft, [90]))).not.toBe(matchingKey(draft));
  });
});

describe('isDegreeLevel', () => {
  it('knows which education levels are degrees', () => {
    expect(isDegreeLevel('Bachelor’s degree')).toBe(true);
    expect(isDegreeLevel('Diploma')).toBe(true);
    expect(isDegreeLevel('Higher secondary (A/L)')).toBe(false);
    expect(isDegreeLevel('')).toBe(false);
  });
});
