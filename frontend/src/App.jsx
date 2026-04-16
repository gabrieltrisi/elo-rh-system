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
import Leave from './pages/Leave';
import Suspensions from './pages/Suspensions';
import CalendarPage from './pages/CalendarPage';
import AdmissionForm from './pages/AdmissionForm';

import Layout from './components/Layout';
import api from './services/api';

function PlaceholderPage({ title, description }) {
  return (
    <div className='space-y-4'>
      <h1 className='text-3xl font-bold'>{title}</h1>
      <p>{description}</p>
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

      {page === 'timesheet' && <PlaceholderPage title='Folha de Ponto' />}

      {page === 'bankHours' && <PlaceholderPage title='Banco de Horas' />}
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
        {/* 🔥 ROTA PÚBLICA (SEM LOGIN) */}
        <Route path='/admission/:token' element={<AdmissionForm />} />

        {/* 🔐 LOGIN */}
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

        {/* 🔒 APP PRIVADO */}
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
