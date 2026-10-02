import { useId } from 'react';
import {
  VACANCY_FEATURE_OPTIONS,
  type VacancyFeatureKey,
  type VacancyFeatureSettings as Settings,
} from '../../dashboard/vacancyFeatures';
import { Switch } from '../ui/Switch';

/**
 * "AI & Matching Settings" section of the vacancy form. Fully controlled: the
 * parent form owns the values, so they survive step changes, failed saves and
 * resets exactly like its other fields. The two switches are independent.
 */
export function VacancyFeatureSettings({
  value,
  onChange,
  disabled = false,
}: Readonly<{
  value: Settings;
  onChange: (next: Settings) => void;
  disabled?: boolean;
}>) {
  const baseId = useId();
  const setFeature = (key: VacancyFeatureKey, checked: boolean) => onChange({ ...value, [key]: checked });

  return (
    <fieldset className="border-t border-slate-100 pt-6">
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        AI &amp; Matching Settings
      </legend>
      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {VACANCY_FEATURE_OPTIONS.map(({ key, label, description }) => {
          const switchId = `${baseId}-${key}`;
          const descriptionId = `${switchId}-description`;
          return (
            <li key={key} className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <label htmlFor={switchId} className="block text-sm font-medium text-slate-700">
                  {label}
                </label>
                <p id={descriptionId} className="mt-1 text-xs text-slate-500">
                  {description}
                </p>
              </div>
              <Switch
                id={switchId}
                checked={value[key]}
                onChange={(checked) => setFeature(key, checked)}
                disabled={disabled}
                describedBy={descriptionId}
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
