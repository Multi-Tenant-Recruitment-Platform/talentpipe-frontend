/**
 * Placeholder shown while the company profile loads.
 *
 * <p>Shaped like the profile it is standing in for — logo, headline, two rows
 * of detail — so the page does not visibly jump when the real content lands.
 * `aria-busy` with a plain-text label because a screen reader gets nothing at
 * all from grey rectangles.</p>
 */
export function CompanyProfileSkeleton({ logoSize = 'md' }: { logoSize?: 'md' | 'lg' }) {
  const logo = logoSize === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-16 w-16 rounded-xl';

  return (
    <div className="animate-pulse space-y-6" data-testid="profile-skeleton" aria-busy="true">
      <span className="sr-only">Loading company profile…</span>
      <div className="flex items-center gap-4">
        <div className={`${logo} bg-slate-200`} />
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-3 w-32 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-6">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-11/12 rounded bg-slate-100" />
        <div className="h-3 w-3/5 rounded bg-slate-100" />
      </div>
      <div className="grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="space-y-2">
            <div className="h-3 w-16 rounded bg-slate-100" />
            <div className="h-4 w-40 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
