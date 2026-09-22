import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import interviewImage from '../assets/interview.jpg';

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const iconProps = {
  width: 20,
  height: 20,
  'aria-hidden': true,
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
} as const;

/** Platform highlights shown as small cards on the brand panel. */
const FEATURES: Feature[] = [
  {
    title: 'AI Contextual Screening',
    description: 'Rank candidates by skills and context, not keywords.',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
        />
      </svg>
    ),
  },
  {
    title: 'Talent Pool Reuse',
    description: 'Rediscover past applicants for every new role.',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
  },
  {
    title: 'Hiring Analytics',
    description: 'Live insight across your entire hiring funnel.',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
    ),
  },
  {
    title: 'Multi-Tenant Workspaces',
    description: 'Secure, isolated workspaces for every company.',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
        />
      </svg>
    ),
  },
];

/**
 * Brand panel shared by the auth pages: platform pitch, hero image and the
 * highlight cards. Hidden on small screens, where the form stands alone.
 */
export function AuthBrandPanel() {
  return (
    <div className="tp-brand-panel">
      {/* Full-bleed photograph: the panel *is* the image, everything else
          layers on top of it. */}
      <img
        src={interviewImage}
        alt="A recruiter reviewing a CV during a video interview"
        className="tp-brand-photo"
      />

      {/* Three stacked treatments, each doing one job:
          1. a brand multiply tint pulls the photo's warm office tones into the
             brand family so it matches the buttons and nav;
          2. a bottom-up scrim builds the dark ground the headline sits on;
          3. a top scrim does the same, lighter, for the wordmark.
          Without these the white text lands on mid-tone photo and fails
          contrast in patches as the image changes. */}
      <div aria-hidden="true" className="tp-brand-tint" />
      <div aria-hidden="true" className="tp-brand-scrim" />
      <div aria-hidden="true" className="tp-brand-scrim-top" />

      {/* Dot grid, kept very faint so it reads as texture, not pattern. */}
      <div aria-hidden="true" className="tp-brand-dots" />

      {/* space-between pins the wordmark to the top and the copy to the
          bottom, the way the reference layout reads. */}
      <Flex vertical justify="space-between" className="tp-brand-body">
        <Flex align="center" gap={10}>
          <span className="tp-brand-chip">T</span>
          <Typography.Text strong style={{ fontSize: 18, color: '#fff' }}>
            TalentPipe
          </Typography.Text>
        </Flex>

        <div style={{ marginTop: 40 }}>
          <span className="tp-brand-pill">
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            AI-powered hiring
          </span>
          <Typography.Title level={2} className="tp-brand-heading">
            Multi-Tenant Recruitment Platform
          </Typography.Title>
          <Typography.Paragraph className="tp-brand-lede">
            One intelligent workspace for every company — screen, rediscover and analyse talent
            without leaving your pipeline.
          </Typography.Paragraph>

          <dl className="tp-brand-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="tp-brand-feature">
                <span className="tp-brand-feature-icon">{feature.icon}</span>
                <dt className="tp-brand-feature-title">{feature.title}</dt>
                <dd className="tp-brand-feature-text">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Flex>
    </div>
  );
}
