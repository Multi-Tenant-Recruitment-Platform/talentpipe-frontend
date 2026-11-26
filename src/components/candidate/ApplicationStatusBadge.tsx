import { Tag } from 'antd';
import { applicationStatusMeta } from '../../candidate/myApplications';

/**
 * An application's status as a colour-coded pill: blue in review, purple
 * shortlisted, orange interview, green offered, red rejected.
 *
 * <p>Unlike the dashboard's `Badge`, which keeps to semantic tones on purpose,
 * each stage gets its own colour here because the candidate reads progress
 * through it. The label still names the status, so colour is never the only
 * signal.</p>
 */
export function ApplicationStatusBadge({ status }: Readonly<{ status: string }>) {
  const meta = applicationStatusMeta(status);
  return (
    <Tag
      className={`me-0 inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-small font-semibold ${meta.className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${meta.tone.solid}`} />
      {meta.label}
    </Tag>
  );
}
