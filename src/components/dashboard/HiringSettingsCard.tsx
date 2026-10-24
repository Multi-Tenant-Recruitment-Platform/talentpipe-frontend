import { AimOutlined, EyeInvisibleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Skeleton, Switch } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { companyApi } from '../../api/company';
import type { TenantSettings, TenantSettingsUpdate } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Button } from '../ui/Button';
import type { IconComponent } from '../ui/icon';
import { Card } from './Card';

type SettingKey = keyof TenantSettingsUpdate;

const SETTINGS: { key: SettingKey; icon: IconComponent; label: string; description: string; scope: string }[] = [
  {
    key: 'blindScreeningEnabled',
    icon: EyeInvisibleOutlined,
    label: 'Blind screening',
    description:
      "Reviewers see an application without the applicant's name, photo or contact details, so the first read is on the work alone.",
    scope: 'Every vacancy',
  },
  {
    key: 'aiScreeningDefault',
    icon: ThunderboltOutlined,
    label: 'AI screening',
    description: "Scores each application against the vacancy's requirements as it arrives.",
    scope: 'New vacancies start with this',
  },
  {
    key: 'candidateMatchingDefault',
    icon: AimOutlined,
    label: 'Candidate matching',
    description: 'Suggests people from your talent pool whose profile fits the vacancy.',
    scope: 'New vacancies start with this',
  },
];

/**
 * The company's hiring switches (PB-015): blind screening for every vacancy,
 * and whether new vacancies start with the AI features on.
 *
 * <p>Each switch saves as it is flipped, like the ones on a vacancy's page,
 * and goes back with the reason if the server refuses. The two AI ones are
 * defaults, and the tile says so: a vacancy already open keeps its own
 * setting, which is changed on that vacancy.</p>
 */
export function HiringSettingsCard() {
  const { user } = useAuth();
  const allow = useCan();
  const canEdit = allow('settings.edit');
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Partial<Record<SettingKey, boolean>>>({});
  const [error, setError] = useState<{ key: SettingKey; text: string } | null>(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const answer = await companyApi.settings();
      if (ticket === latest.current) {
        setSettings(answer);
        setLoadError(null);
      }
    } catch (err: unknown) {
      if (ticket === latest.current) {
        setLoadError(apiErrorMessage(err, 'We could not load your hiring settings.'));
      }
    }
  }, []);

  // Again when the signed-in identity changes, so another workspace's switches never linger.
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  async function flip(key: SettingKey, next: boolean) {
    setError(null);
    setPending((current) => ({ ...current, [key]: next }));
    try {
      setSettings(await companyApi.updateSettings({ [key]: next }));
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

  let body;
  if (!settings && loadError) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-small text-slate-600">{loadError}</span>
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  } else if (!settings) {
    body = (
      <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
        {SETTINGS.map(({ key }) => (
          <Skeleton key={key} active paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  } else {
    body = (
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {SETTINGS.map(({ key, icon: Glyph, label, description, scope }) => {
          const busy = key in pending;
          const checked = busy ? Boolean(pending[key]) : settings[key];
          const id = `company-setting-${key}`;
          return (
            <li
              key={key}
              className={`flex flex-col rounded-2xl border p-4 transition-colors duration-(--tp-motion-base) ${
                checked ? 'border-primary-200 bg-primary-50/50' : 'border-slate-200 bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex size-9 items-center justify-center rounded-xl ${
                    checked ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Glyph aria-hidden className="text-[16px]" />
                </span>
                <Switch
                  id={id}
                  checked={checked}
                  loading={busy}
                  disabled={!canEdit || busy}
                  aria-describedby={`${id}-description`}
                  onChange={(next) => void flip(key, next)}
                />
              </div>
              <label htmlFor={id} className={`mt-3 block font-semibold text-slate-900 ${canEdit ? 'cursor-pointer' : ''}`}>
                {label}
              </label>
              <p id={`${id}-description`} className="m-0 mt-1 flex-1 text-small text-slate-600">
                {description}
              </p>
              <p className="m-0 mt-3 text-caption font-medium uppercase tracking-caps text-slate-500">{scope}</p>
              {error?.key === key && (
                <p role="alert" className="m-0 mt-2 text-caption font-medium text-error-text">
                  {error.text}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card
      title="Hiring"
      subtitle={
        canEdit
          ? 'How applications are reviewed, and what new vacancies start with.'
          : 'How applications are reviewed here. Only someone who can edit company settings can change these.'
      }
    >
      {body}
    </Card>
  );
}
