import { Flex, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { HeroBackdrop, heroSurface } from '../jobs/HeroBand';

/** The page header's banner: the hero surface, rounded, with its own padding. */
export const pageBanner = `${heroSurface} mb-6 rounded-3xl px-6 py-7 shadow-lg sm:px-8 sm:py-8 lg:mb-8`;

/**
 * For an action slot on the banner. Actions are styled by their callers for a
 * light page, so this adapts the one kind that would vanish on slate: a text
 * (ghost) button turns white, with a translucent hover. Filled and outlined
 * buttons carry their own background and need nothing.
 */
export const bannerActions =
  '[&_.ant-btn-text]:text-white [&_.ant-btn-text:not(:disabled):hover]:bg-white/10 [&_.ant-btn-text:not(:disabled):hover]:text-white';

/**
 * Consistent page heading for the workspace: title + subtitle on the left,
 * actions right, set on the same slate-to-blue surface the public job pages
 * open with — so the dashboard and the job board read as one product.
 *
 * <p>No kicker above the title. The sidebar's active item already says which
 * section you are in, so a small "Workspace" over the heading restated the
 * navigation and pushed the real title down a row.</p>
 *
 * <p>The actions slot takes {@link bannerActions}, so a ghost button passed
 * in still reads on the dark surface.</p>
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  children?: ReactNode;
}>) {
  return (
    <header className={pageBanner}>
      <HeroBackdrop />
      <Flex wrap align="flex-end" justify="space-between" gap={16}>
        <div className="min-w-0">
          <Typography.Title level={1} className="m-0 text-heading tracking-heading text-white">
            {title}
          </Typography.Title>
          {subtitle && <Typography.Text className="mt-1.5 block max-w-2xl text-slate-300">{subtitle}</Typography.Text>}
        </div>
        {/* Space with an explicit centre alignment, not ad-hoc margins: every
            action lands on one baseline and inherits the same control height
            from the theme, so a secondary and a primary button can never end up
            a pixel out of step. Order is conventional — secondary first, primary
            last and closest to the edge, where the eye finishes. */}
        {children && (
          <Space
            size={8}
            align="center"
            wrap
            className={bannerActions}
          >
            {children}
          </Space>
        )}
      </Flex>
    </header>
  );
}
