import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { CandidateRegisterPage } from './pages/CandidateRegisterPage';
import { CompanyProfilePage } from './pages/dashboard/CompanyProfilePage';
import { CompanySettingsPage } from './pages/dashboard/CompanySettingsPage';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { PipelinePage } from './pages/dashboard/PipelinePage';
import { TeamPage } from './pages/dashboard/TeamPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { JobsPage } from './pages/JobsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public + auth pages share the marketing chrome. */}
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register-candidate" element={<CandidateRegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Landing pages for emailed links — the token arrives in the query string. */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
        </Route>

        {/* The company workspace gets its own full-screen chrome. Each child
            names the permission it needs, so a role that lacks it sees a 403
            in place rather than a page that only 403s from the API. */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requires="dashboard.view" redirectTo="/jobs">
              <DashboardLayout />
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
