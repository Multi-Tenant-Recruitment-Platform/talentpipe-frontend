import { AppstoreOutlined, BarChartOutlined, StarFilled, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import interviewImage from '../assets/interview.jpg';
import { fontSize } from '../theme/tokens';

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
          <Typography.Text strong style={{ fontSize: fontSize.title, color: '#fff' }}>
            TalentPipe
          </Typography.Text>
        </Flex>

        <div style={{ marginTop: 40 }}>
          <span className="tp-brand-pill">
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
