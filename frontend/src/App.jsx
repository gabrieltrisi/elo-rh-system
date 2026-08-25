import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthSessionProvider, useAuthSession } from './contexts/AuthSessionContext';
import api from './services/api';

const Layout = lazy(() => import('./components/Layout'));
const AdmissionForm = lazy(() => import('./pages/AdmissionForm'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Employees = lazy(() => import('./pages/Employees'));
const Users = lazy(() => import('./pages/Users'));
const RolesPermissions = lazy(() => import('./pages/RolesPermissions'));
const AuditCenter = lazy(() => import('./pages/AuditCenter'));
const Integrations = lazy(() => import('./pages/Integrations'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PreAdmission = lazy(() => import('./pages/PreAdmission'));
const UniformStock = lazy(() => import('./pages/UniformStock'));
const Vacations = lazy(() => import('./pages/Vacations'));
const Certificates = lazy(() => import('./pages/Certificates'));
const Warnings = lazy(() => import('./pages/Warnings'));
const Documents = lazy(() => import('./pages/Documents'));
const Trainings = lazy(() => import('./pages/Trainings'));
const Benefits = lazy(() => import('./pages/Benefits'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Performance = lazy(() => import('./pages/Performance'));
const Leave = lazy(() => import('./pages/Leave'));
const Suspensions = lazy(() => import('./pages/Suspensions'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Payslips = lazy(() => import('./pages/Payslips'));
const PayrollEvents = lazy(() => import('./pages/PayrollEvents'));
const PayrollCharges = lazy(() => import('./pages/PayrollCharges'));
const Timesheet = lazy(() => import('./pages/Timesheet'));
const BankHours = lazy(() => import('./pages/BankHours'));
const WorkSchedules = lazy(() => import('./pages/WorkSchedules'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

const pageComponentMap = {
  dashboard: Dashboard,
  reports: Reports,
  employees: Employees,
  users: Users,
  rolesPermissions: RolesPermissions,
  audit: AuditCenter,
  integrations: Integrations,
  settings: SettingsPage,
  preadmission: PreAdmission,
  stock: UniformStock,
  vacations: Vacations,
  certificates: Certificates,
  warnings: Warnings,
  documents: Documents,
  trainings: Trainings,
  benefits: Benefits,
  onboarding: Onboarding,
  recruitment: Recruitment,
  performance: Performance,
  leave: Leave,
  suspensions: Suspensions,
  calendar: CalendarPage,
  payroll: Payroll,
  payslips: Payslips,
  payrollEvents: PayrollEvents,
  payrollCharges: PayrollCharges,
  timesheet: Timesheet,
  bankHours: BankHours,
  workSchedules: WorkSchedules,
  help: HelpCenter,
};

function PageLoadingFallback() {
  return (
    <div className='flex min-h-[40vh] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
      <div className='text-center'>
        <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-400'>
          EloSystem
        </p>
        <p className='mt-3 text-lg font-semibold text-slate-800'>
          Carregando modulo...
        </p>
      </div>
    </div>
  );
}

function RouteLoadingFallback() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-100 px-6'>
      <div className='rounded-3xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm'>
        <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-400'>
          EloSystem
        </p>
        <p className='mt-3 text-base font-semibold text-slate-800'>
          Preparando experiencia...
        </p>
      </div>
    </div>
  );
}

function PrivateApp({ onLogout, badges }) {
  const [page, setPage] = useState('dashboard');
  const ActivePage = useMemo(
    () => pageComponentMap[page] || Dashboard,
    [page]
  );

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Layout
        onLogout={onLogout}
        onNavigate={setPage}
        currentPage={page}
        pendingCertificates={badges.pendingCertificates}
        warningCount={badges.warningCount}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          {page === 'dashboard' ? (
            <Dashboard onNavigate={setPage} />
          ) : page === 'help' ? (
            <HelpCenter onNavigate={setPage} />
          ) : (
            <ActivePage />
          )}
        </Suspense>
      </Layout>
    </Suspense>
  );
}

function RouteElement({ children }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}

function AppShell() {
  const { isAuthenticated, login, logout } = useAuthSession();
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  const handleLogout = () => {
    logout();
  };

  const fetchBadges = useCallback(async () => {
    try {
      const dashboard = await api.get('/dashboard');
      setPendingCertificates(
        dashboard.data.dashboard?.pendingCertificates ||
          dashboard.data.dashboard?.quickActionBadges?.certificates ||
          0
      );
      setWarningCount(
        dashboard.data.dashboard?.quickActionBadges?.warnings || 0
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Erro ao carregar badges', err);
      }
      setPendingCertificates(0);
      setWarningCount(0);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBadges();
    } else {
      setPendingCertificates(0);
      setWarningCount(0);
    }
  }, [fetchBadges, isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/admission/:token'
          element={
            <RouteElement>
              <AdmissionForm />
            </RouteElement>
          }
        />
        <Route
          path='/forgot-password'
          element={
            <RouteElement>
              <ForgotPassword />
            </RouteElement>
          }
        />
        <Route
          path='/reset-password'
          element={
            <RouteElement>
              <ResetPassword />
            </RouteElement>
          }
        />

        <Route
          path='/login'
          element={
            isAuthenticated ? (
              <Navigate to='/' />
            ) : (
              <RouteElement>
                <Login onLogin={login} />
              </RouteElement>
            )
          }
        />

        <Route
          path='/*'
          element={
            isAuthenticated ? (
              <PrivateApp
                onLogout={handleLogout}
                badges={{ pendingCertificates, warningCount }}
              />
            ) : (
              <Navigate to='/login' />
            )
          }
        />
      </Routes>

      <Toaster
        position='top-right'
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthSessionProvider>
      <AppShell />
    </AuthSessionProvider>
  );
}

export default App;
