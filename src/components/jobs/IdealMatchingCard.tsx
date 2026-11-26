import { EditOutlined } from '@ant-design/icons';
import { Card, Flex, Progress, Skeleton, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { IdealMatchingResponse, JobVacancyResponse, MatchingCategory } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { CATEGORY_LABELS, REQUIREMENT_LABELS } from '../../dashboard/idealMatching';
import { canEditVacancy } from '../../dashboard/jobVacancy';
import { useIdealMatching } from '../../dashboard/useIdealMatching';
import { space } from '../../theme/tokens';
import { Button } from '../ui/Button';

const GROUPS: MatchingCategory[] = ['TECHNICAL_SKILL', 'TOOL', 'EXPERIENCE'];

/**
 * The vacancy's ideal candidate at a glance: what each skill, tool and
 * experience counts for, which are must-haves, and the unweighted degree
 * types and certifications. Company-side only — candidates never see it.
 *
 * <p>Read-only: the profile is edited with the vacancy, in its form, so the
 * 100% is checked together with everything else that is saved.</p>
 */
export function IdealMatchingCard({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  const allow = useCan();
  const { profile, loading, error, refresh } = useIdealMatching(vacancy.id, vacancy.version);

  // A vacancy whose template does not offer matching has nothing to show.
  if (!loading && !error && profile && !profile.available) {
    return null;
  }

  const canEdit = allow('jobs.manage') && canEditVacancy(vacancy.status);

  let body;
  if (loading && !profile) {
    body = <Skeleton active paragraph={{ rows: 3 }} />;
  } else if (error && !profile) {
    body = (
      <Flex vertical gap={8} align="flex-start">
        <Typography.Text type="secondary" className="text-small">
          {error}
        </Typography.Text>
        <Button size="sm" variant="secondary" onClick={() => void refresh()}>
          Try again
        </Button>
      </Flex>
    );
  } else if (profile && !profile.enabled) {
    body = (
      <Typography.Text type="secondary" className="text-small">
        Off. AI screening uses its general criteria for this vacancy.
      </Typography.Text>
    );
  } else if (profile) {
    body = <Profile profile={profile} />;
  }

  return (
    <Card styles={{ body: { padding: space[3] } }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="tp-legend m-0">Ideal candidate</h2>
        {canEdit && profile && (
          <Link
            to={`/dashboard/jobs/${vacancy.id}/edit#matching`}
            className="tp-cta-link inline-flex items-center gap-1.5 text-small"
            aria-label="Edit the ideal candidate"
          >
            <EditOutlined aria-hidden className="text-[14px]" />
            Edit
          </Link>
        )}
      </div>
      {body}
    </Card>
  );
}

function Profile({ profile }: Readonly<{ profile: IdealMatchingResponse }>) {
  const total = profile.totalWeightPercent;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-baseline justify-between text-small">
          <span className="text-slate-600">Total weight</span>
          <strong className="tabular-nums text-slate-900">{total}%</strong>
        </div>
        <Progress
          percent={Math.min(total, 100)}
          showInfo={false}
          size="small"
          status={total === 100 ? 'success' : total > 100 ? 'exception' : 'normal'}
          aria-label={`Total weight ${total}% of 100%`}
          className="m-0"
        />
      </div>

      {GROUPS.map((category) => {
        const rows = profile.criteria.filter((criterion) => criterion.category === category);
        if (rows.length === 0) {
          return null;
        }
        return (
          <div key={category}>
            <h3 className="mb-1.5 text-caption font-semibold uppercase tracking-caps text-slate-500">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {rows.map((criterion) => (
                <li key={criterion.id} className="flex items-center justify-between gap-2 text-small">
                  <span className="min-w-0 truncate text-slate-900">
                    {criterion.name}
                    {criterion.requirement === 'MUST_HAVE' && (
                      <Tag className="ms-2 me-0 text-caption">{REQUIREMENT_LABELS.MUST_HAVE}</Tag>
                    )}
                  </span>
                  <span className="tabular-nums text-slate-600">
                    {criterion.weightPercent > 0 ? `${criterion.weightPercent}%` : 'No weight'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {(profile.degreeTypes.length > 0 || profile.niceToHaveCertifications.length > 0) && (
        <div className="border-t border-slate-100 pt-3 text-small">
          <span className="mb-1 block text-caption text-slate-500">Not part of the 100%</span>
          {profile.degreeTypes.length > 0 && (
            <p className="m-0 text-slate-700">
              <span className="font-medium">Degree types:</span> {profile.degreeTypes.join(', ')}
            </p>
          )}
          {profile.niceToHaveCertifications.length > 0 && (
            <p className="m-0 text-slate-700">
              <span className="font-medium">Nice-to-have certifications:</span>{' '}
              {profile.niceToHaveCertifications.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
