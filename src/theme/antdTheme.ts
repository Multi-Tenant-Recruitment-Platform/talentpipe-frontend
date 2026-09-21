import type { ThemeConfig } from 'antd';

/**
 * The single source of truth for TalentPipe's visual language.
 *
 * <p>These values are not new design work: they are the Tailwind palette the
 * screens were already built against, lifted into antd tokens so one theme
 * drives every control instead of each screen re-deriving its own spacing,
 * focus ring and form rhythm.</p>
 *
 * <p>The app previously carried two competing brand gradients —
 * indigo-600→violet-600 across the dashboard and blue-600→sky-500 across the
 * auth pages. Indigo wins: it owned the dashboard, the shared button and every
 * badge tone, so it is the larger surface and the one users see after sign-in.</p>
 */

/** slate-900 — body copy. */
const SLATE_900 = '#0f172a';
/** slate-500 — secondary copy. */
const SLATE_500 = '#64748b';
/** slate-50 — the app canvas behind every card. */
const SLATE_50 = '#f8fafc';
/** slate-200 / slate-300 — hairlines and control borders. */
const SLATE_200 = '#e2e8f0';
const SLATE_300 = '#cbd5e1';
/** indigo-600 — brand. */
const INDIGO_600 = '#4f46e5';
/** indigo-50 / indigo-700 — selected navigation. */
const INDIGO_50 = '#eef2ff';
const INDIGO_700 = '#4338ca';

/**
 * Reserved for the two brand marks (the dashboard sidebar logo and the public
 * header logo) and nothing else.
 *
 * <p>Deliberately not applied to buttons: antd exposes no gradient API, so
 * faking one means a bespoke class per button — exactly the hand-rolled CSS
 * this migration removes. Buttons use the flat `colorPrimary` instead.</p>
 */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${INDIGO_600}, #7c3aed)`;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: INDIGO_600,
    colorInfo: INDIGO_600,
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',

    colorTextBase: SLATE_900,
    colorTextSecondary: SLATE_500,
    colorBgLayout: SLATE_50,
    colorBorder: SLATE_300,
    colorBorderSecondary: SLATE_200,

    borderRadius: 8,
    borderRadiusLG: 12,

    // Inter is loaded by the @import in index.css; naming it here only selects it.
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: 14,

    // Matches the px-3.5 py-2.5 text-sm control height the forms were built to.
    controlHeight: 40,

    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: SLATE_50,
      headerPadding: '0 24px',
    },
    Menu: {
      itemSelectedBg: INDIGO_50,
      itemSelectedColor: INDIGO_700,
    },
    Button: {
      fontWeight: 600,
    },
    Table: {
      headerBg: SLATE_50,
      headerColor: SLATE_500,
      rowHoverBg: SLATE_50,
    },
  },
};
