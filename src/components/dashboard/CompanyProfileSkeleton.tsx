import { Skeleton, theme } from 'antd';

/**
 * Placeholder shown while the company profile loads.
 *
 * <p>Shaped like the profile it is standing in for — logo, headline, two rows
 * of detail — so the page does not visibly jump when the real content lands.
 * `aria-busy` with a plain-text label because a screen reader gets nothing at
 * all from grey rectangles.</p>
 *
 * <p>antd's `Skeleton` carries neither the test id nor the label, so it stays
 * wrapped rather than used directly.</p>
 */
export function CompanyProfileSkeleton({ logoSize = 'md' }: Readonly<{ logoSize?: 'md' | 'lg' }>) {
  const { token } = theme.useToken();
  const avatarSize = logoSize === 'lg' ? 96 : 64;
  const rule = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div data-testid="profile-skeleton" aria-busy="true">
      <span className="sr-only">Loading company profile…</span>

      <Skeleton
        active
        avatar={{ size: avatarSize, shape: 'square' }}
        title={{ width: 192 }}
        paragraph={{ rows: 1, width: 128 }}
      />

      <div className="mt-6 pt-6" style={{ borderTop: rule }}>
        <Skeleton active title={false} paragraph={{ rows: 3, width: ['100%', '92%', '60%'] }} />
      </div>

      <div
        className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 pt-6"
        style={{ borderTop: rule }}
      >
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} active title={{ width: 64 }} paragraph={{ rows: 1, width: 160 }} />
        ))}
      </div>
    </div>
  );
}
