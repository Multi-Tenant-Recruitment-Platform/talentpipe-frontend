import { Link } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { Card } from '../../components/dashboard/Card';
import { CompanyProfilePanel } from '../../components/dashboard/CompanyProfilePanel';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { useCompanyProfile } from '../../dashboard/useCompanyProfile';

/**
 * Profile Management — the company's profile as a profile, not as a settings
 * form (PB-010).
 *
 * <p>This is the presentation-oriented surface: roomy, sectioned, and written
 * to be read by someone deciding whether to apply. Company Settings keeps its
 * own compact copy for administrative work; both run the same controller and
 * render the same panel, so they cannot disagree about the profile.</p>
 *
 * <p>It is not yet a candidate-facing route — no public company page exists in
 * the router, and inventing one would be a larger architectural decision than
 * this story asks for. What it does give the candidate-facing work is
 * components that already present this data properly.</p>
 */
export function CompanyProfilePage() {
  const controller = useCompanyProfile();
  const allow = useCan();

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="Company profile"
        subtitle="How your company appears to candidates — on your job posts and anywhere your profile is shown."
      />

      <div className="mx-auto max-w-4xl">
        <Card bodyClassName="p-6 sm:p-8">
          <CompanyProfilePanel controller={controller} variant="profile" />
        </Card>

        {/* Two doors to one room, so say so — an admin who edits here should
            not wonder whether Settings holds a different copy. */}
        {allow('settings.view') && (
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Icon name="cog" className="h-3.5 w-3.5 text-slate-400" />
            These details are also editable under
            <Link
              to="/dashboard/settings"
              className="rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Company Settings
            </Link>
            , alongside your workspace and plan.
          </p>
        )}
      </div>
    </>
  );
}
