import { Tag } from 'antd';
import type { VacancyStatus } from '../../api/types';
import { slate, status as statusColor } from '../../theme/tokens';

/**
 * Draft or published.
 *
 * <p>Colour carries meaning here and nowhere else on the row: published is the
 * success green the rest of the product uses for "this is live", and a draft is
 * plain slate because an unfinished vacancy is not a warning — it is simply not
 * out yet.</p>
 */
export function VacancyStatusTag({ value }: Readonly<{ value: VacancyStatus }>) {
  const published = value === 'PUBLISHED';
  return (
    <Tag
      style={{
        margin: 0,
        background: published ? statusColor.successBg : slate[100],
        color: published ? statusColor.successText : slate[600],
        borderColor: 'transparent',
      }}
    >
      {published ? 'Published' : 'Draft'}
    </Tag>
  );
}
