import { AppstoreOutlined, BarChartOutlined, StarFilled, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import interviewImage from '../assets/interview.jpg';
import { BrandLogo } from './BrandLogo';

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

/** Platform highlights shown as small cards on the brand panel. */
const FEATURES: Feature[] = [
  {
    title: 'AI Contextual Screening',
    description: 'Rank candidates by skills and context, not keywords.',
    icon: <StarOutlined aria-hidden className="text-[20px]" />,
  },
  {
    title: 'Talent Pool Reuse',
    description: 'Rediscover past applicants for every new role.',
    icon: <TeamOutlined aria-hidden className="text-[20px]" />,
  },
  {
    title: 'Hiring Analytics',
    description: 'Live insight across your entire hiring funnel.',
    icon: <BarChartOutlined aria-hidden className="text-[20px]" />,
  },
  {
    title: 'Multi-Tenant Workspaces',
    description: 'Secure, isolated workspaces for every company.',
    icon: <AppstoreOutlined aria-hidden className="text-[20px]" />,
  },
];

/**
 * Brand panel shared by the auth pages: platform pitch, hero image and the
 * highlight cards. Hidden on small screens, where the form stands alone.
 */
export function AuthBrandPanel() {
  return (
    // --- Auth brand panel ---
    // The photographic half of the auth split screen. Bespoke by nature — antd has
    // no component for a full-bleed image with layered scrims — and hidden below
    // the large breakpoint, where the form stands alone.
    <div className="tp-brand-panel relative hidden overflow-hidden bg-primary-900 lg:flex lg:flex-col">
      {/* Full-bleed photograph: the panel *is* the image, everything else
          layers on top of it. */}
      <img
        src={interviewImage}
        alt="A recruiter reviewing a CV during a video interview"
        className="absolute inset-0 size-full object-cover object-center"
      />

      {/* Three stacked treatments, each doing one job:
          1. a brand multiply tint pulls the photo's warm office tones into the
             brand family so it matches the buttons and nav;
          2. a bottom-up scrim builds the dark ground the headline sits on;
          3. a top scrim does the same, lighter, for the wordmark.
          Without these the white text lands on mid-tone photo and fails
          contrast in patches as the image changes. */}
      <div aria-hidden="true" className="absolute inset-0 bg-primary-600/32 mix-blend-multiply" />
      <div aria-hidden="true" className="tp-brand-scrim" />
      <div aria-hidden="true" className="tp-brand-scrim-top" />

      {/* Dot grid, kept very faint so it reads as texture, not pattern. */}
      <div aria-hidden="true" className="tp-brand-dots" />

      {/* space-between pins the wordmark to the top and the copy to the
          bottom, the way the reference layout reads. */}
      <Flex vertical justify="space-between" className="relative flex-1 p-10 xl:p-12">
        <BrandLogo tone="dark" markClassName="h-9 w-auto" />

        <div className="mt-10">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/25 bg-white/10 px-3 py-1 text-caption font-semibold uppercase tracking-caps text-primary-50 backdrop-blur-xs">
            <StarFilled aria-hidden className="text-[14px]" />
            AI-powered hiring
          </span>
          <Typography.Title level={2} className="tp-brand-heading">
            Multi-Tenant Recruitment Platform
          </Typography.Title>
          <Typography.Paragraph className="tp-brand-lede">
            One intelligent workspace for every company — screen, rediscover and analyse talent
            without leaving your pipeline.
          </Typography.Paragraph>

          <dl className="m-0 mt-7 grid grid-cols-2 gap-2.5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition-[background,border-color] duration-(--tp-motion-base) ease-standard hover:border-white/30 hover:bg-white/18"
              >
                <span className="inline-flex rounded-sm bg-white/20 p-1.5 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/15%)]">
                  {feature.icon}
                </span>
                <dt className="mt-2.5 font-semibold text-white">{feature.title}</dt>
                <dd className="m-0 mt-1 text-caption leading-[1.5] text-[rgb(219_232_255/88%)]">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Flex>
    </div>
  );
}
