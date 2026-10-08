import type { ThemeConfig } from 'antd';
import {
  fontFamily,
  fontSize,
  fontWeight,
  focusRing,
  focusRingColor,
  layout,
  lineHeight,
  motion,
  primary,
  radius,
  shadow,
  slate,
  space,
  status,
  surface,
} from './tokens';

/**
 * TalentPipe's Ant Design theme — the projection of {@link './tokens'} onto
 * antd's token API.
 *
 * <p>This file decides nothing. Every value here comes from tokens.ts, so the
 * theme and the hand-written CSS cannot disagree; if a value looks wrong,
 * change it there. A colour or type literal appearing in this file is a bug.</p>
 *
 * <p>Blue is the accent on purpose. This tool mediates decisions about
 * people's careers, so the palette has to read as trustworthy and
 * institutional — green would signal "revenue", purple would signal
 * "consumer". Every neutral is slate, which keeps blue meaning exactly one
 * thing: this is actionable, or this is where you are.</p>
 */

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: primary[600],
    colorPrimaryHover: primary[500],
    colorPrimaryActive: primary[700],
    colorPrimaryBg: primary[50],
    colorPrimaryBgHover: primary[100],
    colorPrimaryBorder: primary[200],
    colorInfo: primary[600],
    colorSuccess: status.success,
    colorWarning: status.warning,
    colorError: status.error,

    colorTextBase: slate[900],
    // slate-500 clears 4.5:1 on white and on the canvas — the only grounds
    // antd places secondary text on. Secondary text on a tinted chip uses
    // slate-600 at the call site; see the contrast suite in tokens.test.ts.
    colorTextSecondary: slate[500],
    colorTextTertiary: slate[500],
    colorBgLayout: surface.canvas,
    colorBgContainer: surface.base,
    colorBorder: slate[300],
    colorBorderSecondary: slate[200],

    // ~10–12px on interactive surfaces: soft enough to read as modern, tight
    // enough to still look like enterprise software rather than a toy.
    borderRadius: radius.md,
    borderRadiusLG: radius.lg,
    borderRadiusSM: radius.sm,

    // Inter is loaded by the @import in index.css; naming it here only selects it.
    fontFamily,
    fontSize: fontSize.body,
    fontSizeSM: fontSize.small,
    fontSizeLG: fontSize.lead,
    // h1 is the page title, h2 a card or section title, and so down. The
    // components mostly set their own size; these are the honest defaults for
    // the ones that do not.
    fontSizeHeading1: fontSize.heading,
    fontSizeHeading2: fontSize.section,
    fontSizeHeading3: fontSize.title,
    fontSizeHeading4: fontSize.lead,
    fontSizeHeading5: fontSize.body,
    lineHeight: lineHeight.normal,
    lineHeightHeading1: lineHeight.tight,
    lineHeightHeading2: lineHeight.tight,
    lineHeightHeading3: lineHeight.snug,

    controlHeight: layout.controlHeight,

    boxShadow: shadow.sm,
    boxShadowSecondary: shadow.lg,
    boxShadowTertiary: shadow.xs,

    motionDurationFast: motion.fast,
    motionDurationMid: motion.base,
    motionDurationSlow: motion.slow,

    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: surface.base,
      siderBg: surface.base,
      bodyBg: surface.canvas,
      headerHeight: layout.headerHeight,
      headerPadding: `0 ${space[3]}px`,
    },
    Menu: {
      // The rounded active pill, and the rhythm around it.
      itemHeight: layout.controlHeight,
      itemBorderRadius: radius.sm,
      itemMarginInline: space[1],
      itemMarginBlock: 2,
      itemSelectedBg: primary[50],
      itemSelectedColor: primary[700],
      itemHoverBg: slate[100],
      itemHoverColor: slate[900],
      itemColor: slate[600],
      iconSize: 20,
      // One gap value for every row — this is what keeps the nav items and the
      // pinned "Back to site" link on the same optical left edge.
      iconMarginInlineEnd: space[1.5],
      // The pill already carries the selected state; the rail would double it.
      activeBarWidth: 0,
    },
    Button: {
      fontWeight: fontWeight.semibold,
      primaryShadow: shadow.primary,
      defaultShadow: shadow.xs,
    },
    Input: {
      activeShadow: focusRing,
    },
    Select: {
      activeOutlineColor: focusRingColor,
    },
    Dropdown: {
      borderRadiusLG: radius.xl,
      controlItemBgHover: slate[100],
    },
    Tag: {
      defaultBg: slate[50],
      defaultColor: slate[600],
      borderRadiusSM: radius.pill,
    },
    Table: {
      headerBg: surface.canvas,
      headerColor: slate[600],
      rowHoverBg: surface.canvas,
      borderColor: slate[200],
    },
    Card: {
      colorBorderSecondary: slate[200],
    },
    Modal: {
      borderRadiusLG: radius.xl,
    },
    Segmented: {
      itemSelectedBg: surface.base,
      trackBg: slate[100],
    },
  },
};
