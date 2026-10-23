import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LoginRedirect } from './components/auth/LoginRedirect';
import { RegisterRedirect } from './components/auth/RegisterRedirect';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { JobsPage } from './pages/JobsPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** The board moved to `/`; old links and bookmarks to `/jobs` still land there. */
export function JobsRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/', search, hash }} replace />;
}

// The common public entry points above load up front; everything below is
// split into its own chunk so a job-board visitor never downloads the dashboard.
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout').then((m) => ({ default: m.DashboardLayout })));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })));
const ApplyPage = lazy(() => import('./pages/ApplyPage').then((m) => ({ default: m.ApplyPage })));
const CandidateProfilePage = lazy(() => import('./pages/CandidateProfilePage').then((m) => ({ default: m.CandidateProfilePage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const CompanyProfilePage = lazy(() => import('./pages/dashboard/CompanyProfilePage').then((m) => ({ default: m.CompanyProfilePage })));
const CompanySettingsPage = lazy(() => import('./pages/dashboard/CompanySettingsPage').then((m) => ({ default: m.CompanySettingsPage })));
const CreateJobVacancyPage = lazy(() => import('./pages/dashboard/CreateJobVacancyPage').then((m) => ({ default: m.CreateJobVacancyPage })));
const EditJobVacancyPage = lazy(() => import('./pages/dashboard/EditJobVacancyPage').then((m) => ({ default: m.EditJobVacancyPage })));
const JobVacanciesPage = lazy(() => import('./pages/dashboard/JobVacanciesPage').then((m) => ({ default: m.JobVacanciesPage })));
const OverviewPage = lazy(() => import('./pages/dashboard/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const CreatePipelineTemplatePage = lazy(() =>
  import('./pages/dashboard/CreatePipelineTemplatePage').then((m) => ({ default: m.CreatePipelineTemplatePage })),
);
const EditPipelineTemplatePage = lazy(() =>
  import('./pages/dashboard/EditPipelineTemplatePage').then((m) => ({ default: m.EditPipelineTemplatePage })),
);
const PipelineTemplateDetailPage = lazy(() =>
  import('./pages/dashboard/PipelineTemplateDetailPage').then((m) => ({ default: m.PipelineTemplateDetailPage })),
);
const PipelineTemplatesPage = lazy(() =>
  import('./pages/dashboard/PipelineTemplatesPage').then((m) => ({ default: m.PipelineTemplatesPage })),
);
const PipelinePage = lazy(() => import('./pages/dashboard/PipelinePage').then((m) => ({ default: m.PipelinePage })));
const TeamPage = lazy(() => import('./pages/dashboard/TeamPage').then((m) => ({ default: m.TeamPage })));
const RolesPage = lazy(() => import('./pages/dashboard/RolesPage').then((m) => ({ default: m.RolesPage })));
const RoleEditorPage = lazy(() => import('./pages/dashboard/RoleEditorPage').then((m) => ({ default: m.RoleEditorPage })));
const RoleActivityPage = lazy(() =>
  import('./pages/dashboard/RoleActivityPage').then((m) => ({ default: m.RoleActivityPage })),
);
const VacancyDetailPage = lazy(() => import('./pages/dashboard/VacancyDetailPage').then((m) => ({ default: m.VacancyDetailPage })));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public + auth pages share the marketing chrome. */}
        <Route element={<Layout />}>
          {/* The job board is the home page. */}
          <Route path="/" element={<JobsPage />} />
          <Route path="/jobs" element={<JobsRedirect />} />
          <Route path="/jobs/:jobKey" element={<JobDetailPage />} />
          <Route path="/jobs/:jobKey/apply" element={<ApplyPage />} />
          {/* Registration is a popup too; these open it at the matching form. */}
          <Route path="/register" element={<RegisterRedirect step="company" />} />
          <Route path="/register-candidate" element={<RegisterRedirect step="candidate" />} />
          {/* Login is a popup now; this opens it over the job board. */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Landing pages for emailed links — the token arrives in the query string. */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          {/* The candidate's own profile. A company user who lands here is
              sent to their dashboard instead. */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requires="profile.manageOwn">
                <CandidateProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Any other public URL: a 404 inside the site chrome, not a blank page. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* The company workspace gets its own full-screen chrome. Each child
            names the permission it needs, so a role that lacks it sees a 403
            in place rather than a page that only 403s from the API. */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requires="dashboard.view" redirectTo="/">
              <Suspense fallback={<PageLoader />}>
                <DashboardLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <RequirePermission permission="overview.view">
                <OverviewPage />
              </RequirePermission>
            }
          />
          <Route
            path="team"
            element={
              <RequirePermission permission="team.view">
                <TeamPage />
              </RequirePermission>
            }
          />
          {/* Roles (ADR-9): anyone who sees the team may read them; changing
              them, and the log of changes, needs roles.manage. `new` is
              static, so it outranks `:id`. */}
          <Route
            path="team/roles"
            element={
              <RequirePermission permission="roles.view">
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route
            path="team/roles/new"
            element={
              <RequirePermission permission="roles.manage">
                <RoleEditorPage mode="create" />
              </RequirePermission>
            }
          />
          <Route
            path="team/roles/:id"
            element={
              <RequirePermission permission="roles.view">
                <RoleEditorPage key="edit" mode="edit" />
              </RequirePermission>
            }
          />
          <Route
            path="team/activity"
            element={
              <RequirePermission permission="roles.manage">
                <RoleActivityPage />
              </RequirePermission>
            }
          />
          <Route
            path="pipeline"
            element={
              <RequirePermission permission="pipeline.view">
                <PipelinePage />
              </RequirePermission>
            }
          />
          {/* The form has its own URL for the same reasons the profile editor
              does: it survives a reload, it can be linked to, and Back leaves
              it rather than unwinding one field at a time. */}
          {/* Every member may read the vacancies they work on; creating and
              editing still needs jobs.manage. */}
          <Route
            path="jobs"
            element={
              <RequirePermission permission="jobs.view">
                <JobVacanciesPage />
              </RequirePermission>
            }
          />
          <Route
            path="jobs/new"
            element={
              <RequirePermission permission="jobs.manage">
                <CreateJobVacancyPage />
              </RequirePermission>
            }
          />
          {/* `jobs/new` is a static segment, so it outranks `:id` whatever the
              order — a vacancy can never be fetched with the id "new". */}
          <Route
            path="jobs/:id"
            element={
              <RequirePermission permission="jobs.view">
                <VacancyDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="jobs/:id/edit"
            element={
              <RequirePermission permission="jobs.manage">
                <EditJobVacancyPage />
              </RequirePermission>
            }
          />
          {/* Pipeline templates: everyone who opens roles may read them; only an
              admin shapes them. `new` is static, so it outranks `:id` and a
              template can never be fetched with the id "new". */}
          <Route
            path="pipeline-templates"
            element={
              <RequirePermission permission="templates.view">
                <PipelineTemplatesPage />
              </RequirePermission>
            }
          />
          <Route
            path="pipeline-templates/new"
            element={
              <RequirePermission permission="templates.manage">
                <CreatePipelineTemplatePage />
              </RequirePermission>
            }
          />
          <Route
            path="pipeline-templates/:id"
            element={
              <RequirePermission permission="templates.view">
                <PipelineTemplateDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="pipeline-templates/:id/edit"
            element={
              <RequirePermission permission="templates.manage">
                <EditPipelineTemplatePage />
              </RequirePermission>
            }
          />
          <Route
            path="profile"
            element={
              <RequirePermission permission="company.profile.view">
                <CompanyProfilePage />
              </RequirePermission>
            }
          />
          {/* The editor has its own URL, so it can be reloaded and linked to,
              and Back leaves it. Only a role that may change the profile gets
              in; everyone else sees the 403 in place. */}
          <Route
            path="profile/edit"
            element={
              <RequirePermission permission="settings.edit">
                <CompanyProfilePage mode="edit" />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings.view">
                <CompanySettingsPage />
              </RequirePermission>
            }
          />
          {/* Without this, /dashboard/typo renders an empty <main>. */}
          <Route path="*" element={<ForbiddenPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
