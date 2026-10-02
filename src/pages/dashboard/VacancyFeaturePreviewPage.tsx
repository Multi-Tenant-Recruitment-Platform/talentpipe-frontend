import { useState } from 'react';
import { Card } from '../../components/dashboard/Card';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { VacancyFeatureSettings } from '../../components/dashboard/VacancyFeatureSettings';
import { DEFAULT_VACANCY_FEATURES, vacancyFeaturesPayload } from '../../dashboard/vacancyFeatures';

// TEMPORARY dev-only preview until the vacancy form exists. Do not commit.
export function VacancyFeaturePreviewPage() {
  const [features, setFeatures] = useState(DEFAULT_VACANCY_FEATURES);
  const [disabled, setDisabled] = useState(false);

  return (
    <div>
      <PageHeader eyebrow="Dev preview" title="Vacancy AI & Matching Settings" subtitle="Temporary page for reviewing the section before the vacancy form exists." />
      <Card>
        <VacancyFeatureSettings value={features} onChange={setFeatures} disabled={disabled} />
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5" onClick={() => setFeatures(DEFAULT_VACANCY_FEATURES)}>
            Reset
          </button>
          <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5" onClick={() => setDisabled((d) => !d)}>
            {disabled ? 'Simulate: done submitting' : 'Simulate: submitting'}
          </button>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-600">Payload that would be sent</p>
        <pre className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
          {JSON.stringify(vacancyFeaturesPayload(features), null, 2)}
        </pre>
      </Card>
    </div>
  );
}
