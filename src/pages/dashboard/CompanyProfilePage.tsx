import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/dashboard/Card';
import { CompanyProfilePanel } from '../../components/dashboard/CompanyProfilePanel';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';

/**
 * Profile Management — the company's profile as a profile, not as a settings
 * form (PB-010).
 *
 * <p>This is the presentation-oriented surface: roomy, sectioned, and written
 * to be read by someone deciding whether to apply. It is also the only place
 * the profile is edited — Company Settings no longer carries a copy.</p>
 *
 * <p>Viewing and editing have their own URLs: {@link PROFILE_PATH} and
 * {@link PROFILE_EDIT_PATH}. The URL is what decides which one is shown, so the
 * editor survives a reload, can be linked to, and the browser's Back button
 * leaves it.</p>
 *
 * <p>It is not yet a candidate-facing route — no public company page exists in
 * the router, and inventing one would be a larger architectural decision than
 * this story asks for. What it does give the candidate-facing work is
 * components that already present this data properly.</p>
 */

const PROFILE_PATH = '/dashboard/profile';
const PROFILE_EDIT_PATH = '/dashboard/profile/edit';

export function CompanyProfilePage({ mode = 'view' }: Readonly<{ mode?: 'view' | 'edit' }>) {
  const controller = useCompanyProfileContext();
  const navigate = useNavigate();
  const { editing, loading, profile, startEditing, discard } = controller;
  const onEditRoute = mode === 'edit';

  // The editor's own open/closed state still lives in the shared controller —
  // Save, Cancel and Discard close it from inside. This keeps that state and
  // the URL in step, in both directions.
  const wasEditing = useRef(editing);
  useEffect(() => {
    const was = wasEditing.current;
    wasEditing.current = editing;
    // Nothing to open until there is a profile to open it on.
    if (loading || !profile) {
      return;
    }
    if (onEditRoute) {
      if (was && !editing) {
        // Saved, cancelled or discarded: the editor closed itself, so leave its
        // URL. `replace`, so Back does not reopen a form that was just closed.
        navigate(PROFILE_PATH, { replace: true });
      } else if (!editing) {
        startEditing();
      }
    } else if (editing) {
      // Left the edit URL some other way — Back, or the profile link in the
      // top bar. The URL says "view", so the unsaved draft goes.
      discard();
    }
    // startEditing, discard and navigate are not stable identities; the effect
    // is driven by the route and the editor state alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEditRoute, editing, loading, profile]);

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title={onEditRoute ? 'Edit company profile' : 'Company profile'}
      />

      <div className="mx-auto max-w-4xl">
        <Card bodyClassName="p-6 sm:p-8">
          <CompanyProfilePanel
            controller={controller}
            variant="profile"
            onEdit={() => navigate(PROFILE_EDIT_PATH)}
          />
        </Card>
      </div>
    </>
  );
}
