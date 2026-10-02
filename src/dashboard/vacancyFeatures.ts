/**
 * Per-vacancy AI feature switches (PB-015 sub-task 4). Blind mode is
 * deliberately not configured per vacancy.
 *
 * ASSUMPTION: the vacancy API contract is not defined yet. The field names and
 * the both-off default below are placeholders — align them with the backend
 * vacancy DTO once it lands; nothing else needs to change.
 */
export interface VacancyFeatureSettings {
  aiScreeningEnabled: boolean;
  candidateMatchingEnabled: boolean;
}

export type VacancyFeatureKey = keyof VacancyFeatureSettings;

export const DEFAULT_VACANCY_FEATURES: VacancyFeatureSettings = {
  aiScreeningEnabled: false,
  candidateMatchingEnabled: false,
};

export const VACANCY_FEATURE_OPTIONS: readonly {
  key: VacancyFeatureKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'aiScreeningEnabled',
    label: 'AI Screening',
    description: "Enable AI-assisted evaluation of applications against this vacancy's requirements.",
  },
  {
    key: 'candidateMatchingEnabled',
    label: 'Candidate Matching',
    description: 'Enable AI-assisted matching of candidate profiles to this vacancy.',
  },
];

/** Initial switch values for the edit screen; anything not a boolean falls back to the default. */
export function vacancyFeaturesFrom(saved?: Partial<Record<VacancyFeatureKey, unknown>> | null): VacancyFeatureSettings {
  return {
    aiScreeningEnabled:
      typeof saved?.aiScreeningEnabled === 'boolean'
        ? saved.aiScreeningEnabled
        : DEFAULT_VACANCY_FEATURES.aiScreeningEnabled,
    candidateMatchingEnabled:
      typeof saved?.candidateMatchingEnabled === 'boolean'
        ? saved.candidateMatchingEnabled
        : DEFAULT_VACANCY_FEATURES.candidateMatchingEnabled,
  };
}

/** Request fields for create/update. Both keys are always sent so `false` is never dropped. */
export function vacancyFeaturesPayload(settings: VacancyFeatureSettings): VacancyFeatureSettings {
  return {
    aiScreeningEnabled: settings.aiScreeningEnabled === true,
    candidateMatchingEnabled: settings.candidateMatchingEnabled === true,
  };
}
