import {
  profileCompleteness,
  websiteLabel,
  type CompanyField,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { Badge } from './Badge';
import { Icon, type IconName } from './Icon';

/**
 * Read view of the company profile — what the admin sees before they decide
 * anything needs changing.
 *
 * <p>Deliberately not a form full of disabled inputs. Disabled fields read as
 * broken rather than as "this is the current value", and they force every
 * visitor to parse a form layout to answer "what is our phone number?". The
 * cost is a second component; the benefit is that the common case — looking —
 * is the cheap one.</p>
 */

interface ContactRow {
  field: CompanyField;
  label: string;
  icon: IconName;
  /** Renders the value as a link when there is something to link to. */
  href?: (value: string) => string;
  display?: (value: string) => string;
}

const CONTACT_ROWS: ContactRow[] = [
  { field: 'email', label: 'Email', icon: 'envelope', href: (v) => `mailto:${v}` },
  // Strips the separators people type: 'tel:' wants dialable characters only.
  { field: 'phone', label: 'Phone', icon: 'phone', href: (v) => `tel:${v.replace(/[^\d+]/g, '')}` },
  { field: 'website', label: 'Website', icon: 'globe', href: (v) => v, display: websiteLabel },
  { field: 'address', label: 'Address', icon: 'map-pin' },
];

const LINK_CLASS =
  'truncate rounded font-medium text-indigo-600 underline-offset-2 hover:underline ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

function NotSet() {
  return <span className="text-sm text-slate-400">Not set</span>;
}

function ContactValue({ row, value }: { row: ContactRow; value: string }) {
  if (value === '') {
    return <NotSet />;
  }
  const text = row.display ? row.display(value) : value;
  if (!row.href) {
    return <span className="text-sm text-slate-800">{text}</span>;
  }
  return (
    <a
      href={row.href(value)}
      // Only the website leaves the app; mailto/tel hand off to the OS.
      {...(row.field === 'website' ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className={`block text-sm ${LINK_CLASS}`}
    >
      {text}
    </a>
  );
}

export function CompanyProfileView({
  values,
  subdomain,
  updatedAt,
  canEdit,
  onEdit,
}: {
  values: CompanyFormValues;
  subdomain: string;
  updatedAt: string | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const completeness = profileCompleteness(values);
  const incomplete = completeness.missing.length > 0;

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="flex items-start gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <Icon name="building" className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {values.name || 'Unnamed company'}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {values.industry ? <Badge tone="indigo">{values.industry}</Badge> : null}
            {values.size ? <Badge tone="slate">{values.size}</Badge> : null}
            {subdomain && <span className="font-mono text-xs text-slate-400">{subdomain}</span>}
          </div>
        </div>
      </div>

      {/* Contact block — the questions this page exists to answer. */}
      <dl className="grid gap-x-6 gap-y-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        {CONTACT_ROWS.map((row) => (
          <div key={row.field} className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <Icon name={row.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {row.label}
              </dt>
              <dd className="mt-0.5 min-w-0" data-testid={`company-${row.field}`}>
                <ContactValue row={row} value={values[row.field]} />
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Description */}
      <div className="border-t border-slate-100 pt-6">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">About</h4>
        {values.description ? (
          // whitespace-pre-line so paragraph breaks the admin typed survive.
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {values.description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            No description yet. This is the short pitch candidates read at the top of your careers
            page.
          </p>
        )}
      </div>

      {/* Nudge, not nagging: it disappears the moment the profile is complete. */}
      {incomplete && canEdit && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium text-slate-600">
              Profile {completeness.filled} of {completeness.total} complete
            </span>
            <span className="tabular-nums text-slate-400">{completeness.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-400">
          {updatedAt ? `Last updated ${formatRelativeTime(updatedAt)}` : 'Not edited yet'}
        </p>
        {canEdit && (
          <Button type="button" variant="secondary" onClick={onEdit}>
            <Icon name="pencil" className="h-4 w-4" />
            Edit profile
          </Button>
        )}
      </div>
    </div>
  );
}
