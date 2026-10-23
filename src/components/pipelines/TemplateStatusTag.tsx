/**
 * Only the archived state is tagged. Active is what every template is by
 * default, and an "Active" tag on every row would be noise the eye has to skip.
 * Borrows the vacancy status look, so "archived" reads the same app-wide.
 */
export function ArchivedTag() {
  return (
    <span className="tp-vacancy-status" data-status="ARCHIVED">
      <span aria-hidden="true" className="tp-vacancy-status-dot" />
      Archived
    </span>
  );
}
