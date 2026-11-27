import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, TeamOutlined } from '@ant-design/icons';
import type { ApplicantCounts } from '../../api/types';
import { StatCard } from '../dashboard/StatCard';

/**
 * The four figures above the applicant list. They follow the server's
 * summary as it is polled, so a new application shows here at once, before
 * the list is reloaded.
 */
export function ApplicantStats({ counts }: Readonly<{ counts: ApplicantCounts }>) {
  const cards = [
    { label: 'Total applicants', value: counts.all, icon: TeamOutlined },
    { label: 'Auto-advanced', value: counts.autoAdvanced, icon: CheckCircleOutlined },
    { label: 'Manual review', value: counts.manualReview, icon: EyeOutlined },
    { label: 'Rejected', value: counts.rejected, icon: CloseCircleOutlined },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={String(card.value)} icon={card.icon} />
      ))}
    </div>
  );
}
