import { SearchOutlined, SolutionOutlined } from '@ant-design/icons';
import { Card, Flex, Input, Radio } from 'antd';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ApplicantVacancyStatus } from '../../api/applicants';
import { ApplicantVacancyCard } from '../../components/applicants/ApplicantVacancyCard';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { useApplicantVacancies } from '../../dashboard/useApplicantVacancies';

const TABS: { value: ApplicantVacancyStatus; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

/**
 * The applicants area: the vacancies whose applicants the member may review,
 * one card each. Live roles by default; closed ones on their own tab, because
 * their applicants are often still being decided after applications stop.
 *
 * <p>Which vacancies appear is the server's rule — everyone who may see every
 * applicant gets the company's, everyone else the ones they work on.</p>
 */
export function ApplicantVacanciesPage() {
  const [params, setParams] = useSearchParams();
  const status: ApplicantVacancyStatus = params.get('status') === 'closed' ? 'closed' : 'published';
  const { state, retry } = useApplicantVacancies(status);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    if (state.status !== 'ready') return [];
    const term = query.trim().toLowerCase();
    return term ? state.vacancies.filter((v) => v.title.toLowerCase().includes(term)) : state.vacancies;
  }, [state, query]);

  function changeTab(next: ApplicantVacancyStatus) {
    const updated = new URLSearchParams(params);
    if (next === 'published') updated.delete('status');
    else updated.set('status', next);
    setParams(updated, { replace: true });
  }

  let body;
  if (state.status === 'loading') {
    body = (
      <Card>
        <RowsSkeleton rows={4} label="Loading vacancies…" />
      </Card>
    );
  } else if (state.status === 'error') {
    body = (
      <Card>
        <ErrorState title="We couldn't load your vacancies" description={state.message} onRetry={retry} />
      </Card>
    );
  } else if (state.vacancies.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={SolutionOutlined}
          title={status === 'published' ? 'No published vacancies yet' : 'No closed vacancies'}
          description={
            status === 'published'
              ? 'Once a vacancy is published, the people who apply to it appear here.'
              : 'Vacancies you close keep their applicants here, so you can finish reviewing them.'
          }
          action={
            status === 'published' ? (
              <Link to="/dashboard/jobs" className="tp-cta-link">
                Go to job vacancies
              </Link>
            ) : undefined
          }
        />
      </Card>
    );
  } else if (shown.length === 0) {
    body = (
      <Card>
        <EmptyState icon={SearchOutlined} title="No vacancies match" description="Try another title." />
      </Card>
    );
  } else {
    body = (
      <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Vacancies">
        {shown.map((vacancy) => (
          <li key={vacancy.id} className="min-w-0">
            <ApplicantVacancyCard vacancy={vacancy} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section>
      <PageHeader title="Applicants" subtitle="Choose a vacancy to review the people who applied." />

      <Flex wrap align="center" justify="space-between" gap={12} className="mb-5">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Which vacancies</legend>
          <Radio.Group
            value={status}
            onChange={(e) => changeTab(e.target.value as ApplicantVacancyStatus)}
            optionType="button"
            buttonStyle="solid"
            options={TABS}
          />
        </fieldset>
        <div className="w-full sm:w-72">
          <label htmlFor="applicant-vacancy-search" className="sr-only">
            Search vacancies by title
          </label>
          <Input
            id="applicant-vacancy-search"
            type="search"
            allowClear
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vacancies"
            prefix={<SearchOutlined aria-hidden className="text-slate-400" />}
          />
        </div>
      </Flex>

      {body}
    </section>
  );
}
