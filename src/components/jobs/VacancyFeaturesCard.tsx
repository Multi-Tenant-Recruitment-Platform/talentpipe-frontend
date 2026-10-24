import { ExperimentOutlined } from '@ant-design/icons';
import { Card, Switch } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import type { JobVacancyResponse } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { space } from '../../theme/tokens';

type FeatureKey = 'aiScreeningEnabled' | 'candidateMatchingEnabled';

const FEATURES: { key: FeatureKey; label: string; description: string }[] = [
  {
    key: 'aiScreeningEnabled',
    label: 'AI screening',
    description: "Scores each application against this vacancy's requirements as it arrives.",
  },
  {
    key: 'candidateMatchingEnabled',
    label: 'Candidate matching',
    description: 'Suggests people from your talent pool whose profile fits this vacancy.',
  },
];

/**
 * The AI switches for one vacancy (PB-015). A new vacancy starts with the
 * company's defaults from Company Settings; this is where one role departs
 * from them.
 *
 * <p>Each switch saves the moment it is flipped — there is nothing else on
 * the card to save with it — and shows the change at once. If the server
 * refuses, the switch goes back and says why beside it, rather than leaving a
 * setting on screen that is not the one stored.</p>
 *
 * <p>A closed or archived vacancy keeps the settings it ended with: there are
 * no more applications for them to act on.</p>
 */
export function VacancyFeaturesCard({
  vacancy,
  onChanged,
}: Readonly<{
  vacancy: JobVacancyResponse;
  onChanged: (vacancy: JobVacancyResponse) => void;
}>) {
  const allow = useCan();
  const [pending, setPending] = useState<Partial<Record<FeatureKey, boolean>>>({});
  const [error, setError] = useState<{ key: FeatureKey; text: string } | null>(null);

  const ended = vacancy.status === 'CLOSED' || vacancy.status === 'ARCHIVED';
  const canSwitch = allow('jobs.manage') && !ended;

  async function flip(key: FeatureKey, next: boolean) {
    setError(null);
    setPending((current) => ({ ...current, [key]: next }));
    try {
      onChanged(await jobsApi.switchFeatures(vacancy.id, { [key]: next }));
    } catch (err: unknown) {
      setError({ key, text: apiErrorMessage(err, 'That setting could not be changed. Try again in a moment.') });
    } finally {
      setPending((current) => {
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
    }
  }

  let note: string | null = null;
  if (ended) {
    note = 'This vacancy has ended, so these stay as they were.';
  } else if (!allow('jobs.manage')) {
    note = 'Only someone who can edit vacancies can change these.';
  }

  return (
    <Card styles={{ body: { padding: space[3] } }}>
      <h2 className="tp-legend m-0 mb-4 flex items-center gap-2">
        <ExperimentOutlined aria-hidden className="text-[13px]" />
        AI assistance
      </h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {FEATURES.map(({ key, label, description }) => {
          const busy = key in pending;
          const checked = busy ? Boolean(pending[key]) : Boolean(vacancy[key]);
          const id = `vacancy-feature-${key}`;
          return (
            <li key={key} className="flex items-start gap-3">
              <Switch
                id={id}
                size="small"
                checked={checked}
                loading={busy}
                disabled={!canSwitch || busy}
                aria-describedby={`${id}-description`}
                onChange={(next) => void flip(key, next)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <label htmlFor={id} className={`block font-medium ${canSwitch ? 'cursor-pointer' : ''}`}>
                  {label}
                </label>
                <p id={`${id}-description`} className="m-0 mt-0.5 text-small text-slate-500">
                  {description}
                </p>
                {error?.key === key && (
                  <p role="alert" className="m-0 mt-1.5 text-caption font-medium text-error-text">
                    {error.text}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {note && <p className="m-0 mt-4 text-caption text-slate-500">{note}</p>}
    </Card>
  );
}
