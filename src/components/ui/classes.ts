/*
 * Class strings shared by several components. Kept as strings, not @apply, so
 * every style stays a Tailwind utility in the `utilities` layer.
 */

/* --- Page container ---
 * The one width every page shares: the public header, the public content and
 * the dashboard content all sit on it, so their left and right edges line up.
 * Side gutters grow with the viewport instead of a fixed narrow column.
 */
export const pageContainer = 'mx-auto w-full max-w-(--tp-content-max-width) px-4 sm:px-6 lg:px-8';

/* --- Profile detail lists ---
 * Real <dl>/<dt>/<dd>, laid out as a grid. antd's Row renders a <div>, which
 * would make the terms and definitions inside it invalid, and Descriptions
 * offers no hook for the per-field test ids these carry.
 * A child spans the full row with `col-span-full`.
 */
export const detailGrid = 'm-0 grid gap-x-6 gap-y-5 sm:grid-cols-2';
export const detailGrid3 = 'm-0 grid gap-x-6 gap-y-5 sm:grid-cols-3';

/** The shell shared by the header popovers (notifications, account). Width is set per panel. */
export const popoverShell = 'overflow-hidden rounded-[14px] border border-slate-200 bg-surface shadow-lg';
