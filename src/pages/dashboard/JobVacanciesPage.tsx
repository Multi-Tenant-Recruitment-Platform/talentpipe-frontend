import { Card, Flex, Table, Typography } from 'antd';
import { useState, type HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { JobVacancyResponse } from '../../api/types';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { VacancyDetailDrawer } from '../../components/jobs/VacancyDetailDrawer';
import { VacancyStatusTag } from '../../components/jobs/VacancyStatusTag';
import { employmentTypeLabel, workplaceTypeLabel } from '../../dashboard/jobVacancy';
import { useJobVacancies } from '../../dashboard/useJobVacancies';
import { fontSize, slate, space } from '../../theme/tokens';
import { formatDate } from '../../utils/format';

/**
 * Every role this workspace has open (PB-011).
 *
 * <p>Empty until someone creates one. There is no seeded example: the overview
 * and pipeline pages already carry fixture numbers, and a fabricated vacancy
 * here would be the one piece of placeholder content a person could mistake for
 * a role their company is actually hiring for.</p>
 */
export function JobVacanciesPage() {
  const { vacancies } = useJobVacancies();
  const [open, setOpen] = useState<JobVacancyResponse | null>(null);

  const createButton = (
    <Link to="/dashboard/jobs/new" className="tp-cta-link">
      <Icon name="plus" size={16} />
      Create vacancy
    </Link>
  );

  const columns = [
    {
      title: 'Role',
      key: 'title',
      render: (vacancy: JobVacancyResponse) => (
        <div style={{ minWidth: 0 }}>
          <Typography.Text strong style={{ display: 'block' }}>
            {vacancy.title || 'Untitled vacancy'}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: fontSize.caption }}>
            {[vacancy.department, vacancy.location].filter(Boolean).join(' · ') || 'No details yet'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      className: 'tp-col-md',
      render: (vacancy: JobVacancyResponse) => (
        <Typography.Text type="secondary">
          {[employmentTypeLabel(vacancy.employmentType), workplaceTypeLabel(vacancy.workplaceType)]
            .filter(Boolean)
            .join(' · ')}
        </Typography.Text>
      ),
    },
    {
      title: 'Openings',
      key: 'openings',
      className: 'tp-col-lg',
      render: (vacancy: JobVacancyResponse) => (
        <Typography.Text style={{ fontVariantNumeric: 'tabular-nums' }}>
          {vacancy.openings}
        </Typography.Text>
      ),
    },
    {
      title: 'Closes',
      key: 'deadline',
      className: 'tp-col-md',
      render: (vacancy: JobVacancyResponse) => (
        <Typography.Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {vacancy.applicationDeadline ? formatDate(vacancy.applicationDeadline) : '—'}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (vacancy: JobVacancyResponse) => <VacancyStatusTag value={vacancy.status} />,
    },
  ];

  return (
    <section>
      <PageHeader
        title="Job vacancies"
        subtitle="Every role this workspace has open, and the drafts on the way to being one."
      >
        {vacancies.length > 0 && createButton}
      </PageHeader>

      {vacancies.length === 0 && (
        <Card>
          <EmptyState
            icon="briefcase"
            title="No vacancies yet"
            description="Create your first one to start collecting applications. It takes about five minutes, and you can save a draft at any point."
            action={createButton}
          />
        </Card>
      )}

      {vacancies.length > 0 && (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            className="tp-vacancy-table"
            dataSource={vacancies}
            columns={columns}
            rowKey="id"
            pagination={false}
            onRow={(vacancy) => ({
              onClick: () => setOpen(vacancy),
              style: { cursor: 'pointer' },
            })}
            // The row is clickable, so it needs to be reachable and operable
            // from the keyboard too — a pointer-only affordance is not one.
            components={{
              body: {
                row: (props: HTMLAttributes<HTMLTableRowElement>) => (
                  <tr
                    {...props}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        (event.currentTarget as HTMLElement).click();
                      }
                    }}
                  />
                ),
              },
            }}
          />
          <Flex
            align="center"
            gap={space[0.75]}
            style={{
              padding: `${space[1.5]}px ${space[3]}px`,
              borderTop: `1px solid ${slate[100]}`,
            }}
          >
            <Icon name="info" size={14} style={{ color: slate[400] }} />
            <Typography.Text type="secondary" style={{ fontSize: fontSize.caption }}>
              Vacancies are kept in this browser until the jobs API is connected.
            </Typography.Text>
          </Flex>
        </Card>
      )}

      <VacancyDetailDrawer vacancy={open} onClose={() => setOpen(null)} />
    </section>
  );
}
