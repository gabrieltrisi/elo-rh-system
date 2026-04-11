import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
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

function App() {
  // 🔥 FORÇA LOGIN NOVO (resolve bug do token)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [page, setPage] = useState('dashboard');
  const [pendingCertificates, setPendingCertificates] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setPage('dashboard');
  };

  const fetchPendingCertificates = async () => {
    try {
      const response = await api.get('/dashboard');

      setPendingCertificates(response.data.dashboard?.pendingCertificates || 0);
    } catch (error) {
      console.error('Erro ao carregar pendências do dashboard:', error);

      try {
        const savedCertificates =
          JSON.parse(localStorage.getItem('certificates')) || [];

        const totalPending = savedCertificates.filter(
          (item) => (item.status || '').toLowerCase() === 'registrado'
        ).length;

        setPendingCertificates(totalPending);
      } catch (localError) {
        console.error('Erro ao carregar pendências locais:', localError);
        setPendingCertificates(0);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingCertificates();
    }
  }, [isAuthenticated, page]);

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={() => setIsAuthenticated(true)} />
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
      </>
    );
  }

  return (
    <>
      <Layout
        onLogout={handleLogout}
        onNavigate={setPage}
        currentPage={page}
        pendingCertificates={pendingCertificates}
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
    </>
  );
}

export default App;
