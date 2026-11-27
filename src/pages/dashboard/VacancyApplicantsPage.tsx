import { ArrowLeftOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { Link, Outlet, useLocation, useMatch, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { ApplicantRow } from '../../api/types';
import { ApplicantReviewDrawer } from '../../components/applicants/ApplicantReviewDrawer';
import { ApplicantsSection } from '../../components/applicants/ApplicantsSection';
import { pageBanner } from '../../components/dashboard/PageHeader';
import { HeroBackdrop } from '../../components/jobs/HeroBand';
import { VacancyStatusTag } from '../../components/jobs/VacancyStatusTag';
import { applicantPath, vacancyApplicantsPath } from '../../dashboard/applicants';
import { useJobVacancy } from '../../dashboard/useJobVacancies';

/** What the list hands the applicant panel it opens. */
interface PanelContext {
  jobId: string;
  rows: ApplicantRow[];
  /** Reloads the list behind the panel after a decision. */
  reload: () => void;
}

/**
 * One vacancy's applicants: a slim header naming the vacancy, then the
 * figures, filters and ranked list. Nothing from the advert itself — this page
 * is about the people who applied.
 *
 * <p>An applicant's panel is a child route, `/dashboard/applicants/:jobId/:applicationId`,
 * rendered over the list, so the list keeps its place behind it.</p>
 */
export function VacancyApplicantsPage() {
  const { jobId = '' } = useParams();
  const open = useMatch('/dashboard/applicants/:jobId/:applicationId');
  const { vacancy } = useJobVacancy(jobId);

  return (
    <section>
      <header className={pageBanner}>
        <HeroBackdrop />
        <Link
          to="/dashboard/applicants"
          className="group mb-5 inline-flex items-center gap-1.5 text-small font-medium text-slate-300 no-underline hover:text-white"
        >
          <ArrowLeftOutlined
            aria-hidden
            className="text-[14px] transition-transform duration-(--tp-motion-base) group-hover:-translate-x-0.5"
          />
          All vacancies
        </Link>
        <p className="m-0 text-caption font-semibold uppercase tracking-caps text-slate-300">Applicants</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Typography.Title level={1} className="m-0 text-heading tracking-heading text-white">
            {vacancy?.title || 'Vacancy'}
          </Typography.Title>
          {vacancy && <VacancyStatusTag value={vacancy.status} />}
          {vacancy?.blindModeEnabled && (
            <Tag color="purple" icon={<EyeInvisibleOutlined aria-hidden />}>
              Blind Mode
            </Tag>
          )}
        </div>
      </header>

      <ApplicantsSection
        jobId={jobId}
        vacancyStatus={vacancy?.status ?? 'PUBLISHED'}
        showHeading={false}
        linkTo={(row, query) => applicantPath(jobId, row.applicationId, query)}
        selectedId={open?.params.applicationId}
        renderDetail={(rows, reload) => <Outlet context={{ jobId, rows, reload } satisfies PanelContext} />}
      />
    </section>
  );
}

/** The applicant panel, opened by its route over the vacancy's list. */
export function ApplicantPanelRoute() {
  const { applicationId = '' } = useParams();
  const { jobId, rows, reload } = useOutletContext<PanelContext>();
  const navigate = useNavigate();
  const { search } = useLocation();

  return (
    <ApplicantReviewDrawer
      applicationId={applicationId}
      rows={rows}
      // Moving between applicants replaces the entry, so Back leaves the panel rather than stepping through it.
      onNavigate={(next) => navigate(applicantPath(jobId, next, search), { replace: true })}
      onClose={() => navigate(vacancyApplicantsPath(jobId, search))}
      onChanged={reload}
    />
  );
}
