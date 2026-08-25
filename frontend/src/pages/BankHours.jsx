import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const formatMinutes = (minutes) => {
  const total = Number(minutes || 0);
  const signal = total < 0 ? '-' : '';
  const absolute = Math.abs(total);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${signal}${String(hours).padStart(2, '0')}h ${String(remainder).padStart(2, '0')}m`;
};

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

function BankHours() {
  const { hasPermission } = useAuthSession();
  const [activeTab, setActiveTab] = useState('list');
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('TODOS');
  const [balances, setBalances] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalCreditsMinutes: 0,
    totalDebitsMinutes: 0,
    totalClosingBalanceMinutes: 0,
    positiveBalances: 0,
    negativeBalances: 0,
  });
  const [options, setOptions] = useState({ departments: [] });
  const [loading, setLoading] = useState(true);

  const canRead = hasPermission('time.bank_hours.read');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        month: monthFilter,
        year: yearFilter,
      };

      if (search.trim()) params.search = search.trim();
      if (departmentFilter !== 'TODOS') params.department = departmentFilter;

      const [balancesResponse, optionsResponse] = await Promise.all([
        api.get('/time/bank-hours', { params }),
        api.get('/time/options'),
      ]);

      setBalances(balancesResponse.data?.balances || []);
      setSummary(
        balancesResponse.data?.summary || {
          totalEmployees: 0,
          totalCreditsMinutes: 0,
          totalDebitsMinutes: 0,
          totalClosingBalanceMinutes: 0,
          positiveBalances: 0,
          negativeBalances: 0,
        }
      );
      setOptions(optionsResponse.data || { departments: [] });
    } catch (error) {
      console.error('Erro ao carregar banco de horas:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível carregar o banco de horas.'
      );
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    loadData();
  }, [monthFilter, yearFilter, search, departmentFilter]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 4 }).map((_, index) => currentYear - index);
  }, []);

  if (!canRead) {
    return (
      <div className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
        <div className='max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-400'>
            Jornada
          </p>
          <h1 className='mt-3 text-3xl font-bold text-slate-900'>
            Acesso restrito
          </h1>
          <p className='mt-3 text-sm text-slate-500'>
            Sua conta ainda não possui permissão para visualizar o Banco de Horas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <section className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-violet-900 px-8 py-8 text-white'>
          <div className='max-w-3xl'>
            <div className='mb-3 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-violet-100'>
              Jornada consolidada
            </div>
            <h1 className='text-4xl font-black tracking-tight'>Banco de Horas</h1>
            <p className='mt-3 text-lg text-slate-200'>
              Acompanhe créditos, débitos e saldo acumulado por colaborador com
              visão pronta para tratativas, compensações e integração futura com
              Departamento Pessoal.
            </p>
          </div>
        </div>
      </section>

      <section className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
        <InfoCard
          title='Colaboradores com saldo'
          value={summary.totalEmployees}
          subtitle='Base consolidada no período'
          tone='slate'
        />
        <InfoCard
          title='Créditos'
          value={formatMinutes(summary.totalCreditsMinutes)}
          subtitle='Horas positivas do período'
          tone='green'
        />
        <InfoCard
          title='Débitos'
          value={formatMinutes(summary.totalDebitsMinutes)}
          subtitle='Compensações e faltas'
          tone='amber'
        />
        <InfoCard
          title='Saldo acumulado'
          value={formatMinutes(summary.totalClosingBalanceMinutes)}
          subtitle='Fechamento agregado'
          tone='blue'
        />
        <InfoCard
          title='Alertas de saldo'
          value={`${summary.negativeBalances}`}
          subtitle='Colaboradores com saldo negativo'
          tone='violet'
        />
      </section>

      <section className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='grid grid-cols-1 gap-5 xl:grid-cols-4'>
          <div className='xl:col-span-2'>
            <label className='mb-2 block text-sm font-semibold text-slate-700'>
              Buscar colaborador, cargo ou departamento
            </label>
            <input
              type='text'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Ex.: Larissa, Administrativo, RH...'
              className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-semibold text-slate-700'>
              Mês
            </label>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {String(index + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-semibold text-slate-700'>
              Ano
            </label>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className='xl:col-span-4'>
            <label className='mb-2 block text-sm font-semibold text-slate-700'>
              Departamento
            </label>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
            >
              <option value='TODOS'>Todos</option>
              {(options.departments || []).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className='rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => setActiveTab('list')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'list'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lista
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('insights')}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'insights'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Insights
          </button>
        </div>
      </section>

      {activeTab === 'list' && (
        <section className='rounded-[2rem] border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-8 py-6'>
            <h2 className='text-3xl font-bold text-slate-900'>
              Saldos consolidados
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Créditos, débitos e saldo acumulado por colaborador no período
              selecionado.
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-slate-200'>
              <thead className='bg-slate-50'>
                <tr className='text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                  <th className='px-8 py-4'>Colaborador</th>
                  <th className='px-6 py-4'>Setor</th>
                  <th className='px-6 py-4'>Saldo anterior</th>
                  <th className='px-6 py-4'>Créditos</th>
                  <th className='px-6 py-4'>Débitos</th>
                  <th className='px-6 py-4'>Movimento</th>
                  <th className='px-8 py-4 text-right'>Saldo atual</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200'>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-8 py-12 text-center text-sm text-slate-500'
                    >
                      Carregando banco de horas...
                    </td>
                  </tr>
                ) : balances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-8 py-12 text-center text-sm text-slate-500'
                    >
                      Nenhum saldo consolidado encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.id} className='align-top text-sm text-slate-700'>
                      <td className='px-8 py-5'>
                        <p className='text-base font-bold text-slate-900'>
                          {balance.employeeName}
                        </p>
                        <p className='mt-1 text-xs text-slate-500'>{balance.role}</p>
                      </td>
                      <td className='px-6 py-5'>{balance.department}</td>
                      <td className='px-6 py-5 font-semibold text-slate-900'>
                        {formatMinutes(balance.previousBalanceMinutes)}
                      </td>
                      <td className='px-6 py-5 text-emerald-700'>
                        {formatMinutes(balance.creditsMinutes)}
                      </td>
                      <td className='px-6 py-5 text-rose-700'>
                        {formatMinutes(balance.debitsMinutes)}
                      </td>
                      <td className='px-6 py-5 text-cyan-700'>
                        {formatMinutes(balance.movementMinutes)}
                      </td>
                      <td className='px-8 py-5 text-right font-bold text-slate-900'>
                        {formatMinutes(balance.closingBalanceMinutes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'insights' && (
        <section className='grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]'>
          <div className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
              Inteligência operacional
            </p>
            <h2 className='mt-3 text-3xl font-bold text-slate-900'>
              Leituras rápidas do período
            </h2>
            <div className='mt-6 space-y-4'>
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-5'>
                <p className='text-sm font-semibold text-emerald-700'>
                  Créditos identificados
                </p>
                <p className='mt-2 text-2xl font-black text-emerald-900'>
                  {formatMinutes(summary.totalCreditsMinutes)}
                </p>
                <p className='mt-2 text-sm text-emerald-700'>
                  Base pronta para conferência de compensações futuras.
                </p>
              </div>

              <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5'>
                <p className='text-sm font-semibold text-amber-700'>
                  Débitos a acompanhar
                </p>
                <p className='mt-2 text-2xl font-black text-amber-900'>
                  {formatMinutes(summary.totalDebitsMinutes)}
                </p>
                <p className='mt-2 text-sm text-amber-700'>
                  Faltas, atrasos e compensações impactando o saldo.
                </p>
              </div>
            </div>
          </div>

          <div className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
              Atenções
            </p>
            <h2 className='mt-3 text-2xl font-bold text-slate-900'>
              Saldo crítico por colaborador
            </h2>
            <div className='mt-6 space-y-3'>
              {balances
                .filter((balance) => balance.closingBalanceMinutes < 0)
                .slice(0, 5)
                .map((balance) => (
                  <div
                    key={balance.id}
                    className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4'
                  >
                    <p className='font-semibold text-slate-900'>{balance.employeeName}</p>
                    <p className='mt-1 text-sm text-slate-500'>
                      {balance.department} • {balance.role}
                    </p>
                    <p className='mt-3 text-lg font-bold text-rose-700'>
                      {formatMinutes(balance.closingBalanceMinutes)}
                    </p>
                  </div>
                ))}

              {!balances.some((balance) => balance.closingBalanceMinutes < 0) ? (
                <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500'>
                  Nenhum saldo negativo relevante identificado neste período.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default BankHours;
