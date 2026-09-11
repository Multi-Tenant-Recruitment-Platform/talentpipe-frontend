import { Icon, type IconName } from './Icon';

export type StatTone = 'indigo' | 'violet' | 'emerald' | 'amber';

/** Icon chip tint plus the hairline that tops the card in the same hue. */
const TONE_CLASSES: Record<StatTone, { chip: string; rule: string }> = {
  indigo: { chip: 'bg-indigo-50 text-indigo-600', rule: 'from-indigo-500 to-violet-500' },
  violet: { chip: 'bg-violet-50 text-violet-600', rule: 'from-violet-500 to-fuchsia-500' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', rule: 'from-emerald-500 to-teal-500' },
  amber: { chip: 'bg-amber-50 text-amber-600', rule: 'from-amber-500 to-orange-500' },
};

/**
 * KPI tile: tinted icon chip, bold value, label, and an optional trend delta
 * (e.g. "+12% vs last week"). The value is the loudest thing on the card —
 * it is what an admin scans for, so it outranks both label and icon.
 */
export function StatCard({
  label,
  value,
  icon,
  tone,
  delta,
}: Readonly<{
  label: string;
  value: string;
  icon: IconName;
  tone: StatTone;
  delta?: { value: string; direction: 'up' | 'down'; hint?: string };
}>) {
  const tones = TONE_CLASSES[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/10">
      {/* Tone accent, revealed on hover so a grid of tiles stays calm at rest. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tones.rule} opacity-0 transition-opacity group-hover:opacity-100`}
      />
      <div className="flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones.chip}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              delta.direction === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            <Icon name={delta.direction === 'up' ? 'trending-up' : 'trending-down'} className="h-3.5 w-3.5" />
            {delta.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">
        {label}
        {delta?.hint && <span className="text-slate-400"> · {delta.hint}</span>}
      </p>
    </div>
  );
}
