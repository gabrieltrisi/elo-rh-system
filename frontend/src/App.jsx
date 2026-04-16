import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UniformStock from './pages/UniformStock';
import Employees from './pages/Employees';
import Vacations from './pages/Vacations';
import Certificates from './pages/Certificates';
import Warnings from './pages/Warnings';
import Documents from './pages/Documents';
import Benefits from './pages/Benefits';
import Onboarding from './pages/Onboarding';
import PreAdmission from './pages/PreAdmission';
import Leave from './pages/Leave';
import Suspensions from './pages/Suspensions';
import CalendarPage from './pages/CalendarPage';
import AdmissionForm from './pages/AdmissionForm';

import Layout from './components/Layout';
import api from './services/api';

function PlaceholderPage({ title, description }) {
  return (
    <div className='space-y-4'>
      <div>
        <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
          ELO
        </p>
        <h1 className='text-3xl font-bold text-slate-800'>{title}</h1>
        <p className='mt-1 text-slate-500'>
          {description || 'Esta tela será construída no próximo passo.'}
        </p>
      </div>

      <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center'>
          <h2 className='text-xl font-semibold text-slate-800'>
            Módulo em preparação
          </h2>
          <p className='mt-2 text-sm text-slate-500'>
            Esta área já está reservada no sistema e será construída no próximo
            passo.
          </p>
        </div>
      </div>
    </div>
  );
}

function PrivateApp({ onLogout, badges }) {
  const [page, setPage] = useState('dashboard');

  return (
    <Layout
      onLogout={onLogout}
      onNavigate={setPage}
      currentPage={page}
      pendingCertificates={badges.pendingCertificates}
      warningCount={badges.warningCount}
    >
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'employees' && <Employees />}
      {page === 'preadmission' && <PreAdmission />}
      {page === 'stock' && <UniformStock />}
      {page === 'vacations' && <Vacations />}
      {page === 'certificates' && <Certificates />}
      {page === 'warnings' && <Warnings />}
      {page === 'documents' && <Documents />}
      {page === 'benefits' && <Benefits />}
      {page === 'onboarding' && <Onboarding />}
      {page === 'leave' && <Leave />}
      {page === 'suspensions' && <Suspensions />}
      {page === 'calendar' && <CalendarPage />}

      {page === 'timesheet' && (
        <PlaceholderPage
          title='Folha de Ponto'
          description='Controle de ponto e acompanhamento das jornadas.'
        />
      )}

      {page === 'bankHours' && (
        <PlaceholderPage
          title='Banco de Horas'
          description='Acompanhe créditos, débitos e saldo de horas.'
        />
      )}
    </Layout>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  const fetchBadges = async () => {
    try {
      const dashboard = await api.get('/dashboard');
      setPendingCertificates(
        dashboard.data.dashboard?.pendingCertificates || 0
      );

      const warnings = await api.get('/warnings');
      setWarningCount((warnings.data?.warnings || []).length);
    } catch (err) {
      console.error('Erro ao carregar badges', err);
      setPendingCertificates(0);
      setWarningCount(0);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(Boolean(token));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBadges();
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/admission/:token' element={<AdmissionForm />} />

        <Route
          path='/login'
          element={
            isAuthenticated ? (
              <Navigate to='/' />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
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

export default App;
