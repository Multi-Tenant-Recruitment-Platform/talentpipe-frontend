import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { JobsPage } from './pages/JobsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

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
const PipelinePage = lazy(() => import('./pages/dashboard/PipelinePage').then((m) => ({ default: m.PipelinePage })));
const TeamPage = lazy(() => import('./pages/dashboard/TeamPage').then((m) => ({ default: m.TeamPage })));
const VacancyDetailPage = lazy(() => import('./pages/dashboard/VacancyDetailPage').then((m) => ({ default: m.VacancyDetailPage })));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Full-screen auth pages — outside the nav chrome ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-candidate" element={<RegisterPage />} />

        {/* Public + auth pages share the marketing chrome. */}
        <Route element={<Layout />}>
          {/* The job board is the home page. */}
          <Route path="/" element={<JobsPage />} />
          <Route path="/jobs" element={<JobsRedirect />} />
          <Route path="/jobs/:jobKey" element={<JobDetailPage />} />
          <Route path="/jobs/:jobKey/apply" element={<ApplyPage />} />
          {/* Landing pages for emailed links — the token arrives in the query string. */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
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
          <Route
            path="jobs"
            element={
              <RequirePermission permission="jobs.manage">
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
              <RequirePermission permission="jobs.manage">
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
