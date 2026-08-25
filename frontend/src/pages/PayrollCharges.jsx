import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
};

const SummaryCard = ({ title, value, subtitle, tone = 'slate' }) => {
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

const InfoBox = ({ label, value }) => (
  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
    <p className='text-sm text-slate-500'>{label}</p>
    <p className='mt-1 text-sm font-semibold text-slate-800'>{value}</p>
  </div>
);

const ConferenceBadge = ({ status }) => {
  const tones = {
    CONFERIDO: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    PRONTO_PARA_CONFERENCIA:
      'border border-blue-200 bg-blue-50 text-blue-700',
    EM_PREPARACAO: 'border border-amber-200 bg-amber-50 text-amber-700',
  };

  const labels = {
    CONFERIDO: 'Conferido',
    PRONTO_PARA_CONFERENCIA: 'Pronto para conferencia',
    EM_PREPARACAO: 'Em preparacao',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        tones[status] || 'border border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {labels[status] || status}
    </span>
  );
};

function PayrollCharges() {
  const { hasPermission } = useAuthSession();
  const [charges, setCharges] = useState([]);
  const [summary, setSummary] = useState({
    totalCompetences: 0,
    readyForConference: 0,
    checkedCompetences: 0,
    totalCharges: 0,
    totalINSSBase: 0,
    totalFGTSBase: 0,
    totalIRRFBase: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const canReadCharges = hasPermission('payroll.charges.read');
  const canExportCharges = hasPermission('payroll.charges.export');

  useEffect(() => {
    fetchCharges();
  }, [yearFilter, statusFilter]);

  const fetchCharges = async () => {
    if (!canReadCharges) {
      setCharges([]);
      setSummary(initialSummary());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = {};
      if (yearFilter !== 'TODOS') params.year = yearFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;

      const response = await api.get('/payroll/charges', { params });
      setCharges(response.data?.charges || []);
      setSummary(response.data?.summary || initialSummary());
    } catch (error) {
      console.error('Erro ao carregar encargos:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar os encargos.'
      );
      setCharges([]);
      setSummary(initialSummary());
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    const values = new Set(
      charges.map((item) => {
        const [, year] = String(item.competence || '').split('/');
        return year;
      })
    );

    values.add(String(new Date().getFullYear()));
    values.add(String(new Date().getFullYear() - 1));

    return Array.from(values).filter(Boolean).sort((a, b) => Number(b) - Number(a));
  }, [charges]);

  const handleOpenDetails = async (charge) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/payroll/runs/${charge.payrollRunId}/charges`);
      setDetails(response.data?.charges || null);
    } catch (error) {
      console.error('Erro ao abrir detalhamento de encargos:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar o detalhamento da competencia.'
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExport = (charge) => {
    alert(
      `Exportacao preparada para os encargos da competencia ${charge.competence}.`
    );
  };

  const renderCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando encargos...
        </div>
      );
    }

    if (charges.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhuma competencia encontrada para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {charges.map((charge) => (
          <div
            key={charge.payrollRunId}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200'>
                    Consolidacao da competencia
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>{charge.competence}</h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    {charge.companyName} - {charge.totalEmployees} colaborador(es)
                  </p>
                </div>

                <ConferenceBadge status={charge.conferenceStatus} />
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox
                  label='Base INSS'
                  value={formatCurrency(charge.bases.inssBase)}
                />
                <InfoBox
                  label='Base FGTS'
                  value={formatCurrency(charge.bases.fgtsBase)}
                />
                <InfoBox
                  label='Base IRRF'
                  value={formatCurrency(charge.bases.irrfBase)}
                />
                <InfoBox
                  label='Encargos totais'
                  value={formatCurrency(charge.totals.totalCharges)}
                />
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-700'>
                  Detalhamento estimado
                </p>
                <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <MiniInfo
                    label='INSS'
                    value={formatCurrency(charge.bases.inssAmount)}
                  />
                  <MiniInfo
                    label='FGTS'
                    value={formatCurrency(charge.bases.fgtsAmount)}
                  />
                  <MiniInfo
                    label='IRRF est.'
                    value={formatCurrency(charge.bases.irrfEstimatedAmount)}
                  />
                </div>
              </div>

              <div className='flex flex-wrap gap-3'>
                <ActionButton
                  label={loadingDetails ? 'Abrindo...' : 'Detalhar'}
                  tone='blue'
                  onClick={() => handleOpenDetails(charge)}
                />
                {canExportCharges ? (
                  <ActionButton
                    label='Exportar'
                    tone='violet'
                    onClick={() => handleExport(charge)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando encargos...
        </div>
      );
    }

    if (charges.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhuma competencia encontrada para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Historico de encargos por competencia
          </h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Competencia
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Base INSS
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Base FGTS
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Base IRRF
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Encargos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Conferencia
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Gerado em
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {charges.map((charge) => (
                <tr key={charge.payrollRunId} className='hover:bg-slate-50/70'>
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>
                        {charge.competence}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {charge.companyName} - {charge.processedEmployees}/
                        {charge.totalEmployees} processado(s)
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatCurrency(charge.bases.inssBase)}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatCurrency(charge.bases.fgtsBase)}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatCurrency(charge.bases.irrfBase)}
                  </td>
                  <td className='px-6 py-5 text-sm font-bold text-slate-800'>
                    {formatCurrency(charge.totals.totalCharges)}
                  </td>
                  <td className='px-6 py-5'>
                    <ConferenceBadge status={charge.conferenceStatus} />
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-600'>
                    {formatDateTime(charge.generatedAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      <MiniActionButton
                        label={loadingDetails ? 'Abrindo...' : 'Detalhar'}
                        tone='blue'
                        onClick={() => handleOpenDetails(charge)}
                      />
                      {canExportCharges ? (
                        <MiniActionButton
                          label='Exportar'
                          tone='violet'
                          onClick={() => handleExport(charge)}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!canReadCharges) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm'>
        <p className='text-sm font-semibold uppercase tracking-[0.2em]'>
          Departamento Pessoal
        </p>
        <h1 className='mt-3 text-3xl font-bold'>Encargos</h1>
        <p className='mt-3 text-base'>
          Seu perfil nao possui acesso para consultar a consolidacao de
          encargos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-emerald-200'>
                Departamento Pessoal
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>Encargos</h1>
              <p className='mt-4 text-lg text-slate-300'>
                Consolide bases, estimativas e historico fiscal-operacional por
                competencia com leitura pronta para conferencia.
              </p>
            </div>

            <div className='rounded-2xl border border-white/15 bg-white/10 px-5 py-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200'>
                Competencias conferidas
              </p>
              <p className='mt-2 text-2xl font-bold'>
                {summary.checkedCompetences}
              </p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <SummaryCard
            title='Competencias'
            value={summary.totalCompetences}
            subtitle='Historico consolidado'
            tone='slate'
          />
          <SummaryCard
            title='Prontas'
            value={summary.readyForConference}
            subtitle='Aguardando conferencia'
            tone='blue'
          />
          <SummaryCard
            title='Conferidas'
            value={summary.checkedCompetences}
            subtitle='Competencias fechadas'
            tone='green'
          />
          <SummaryCard
            title='Base INSS'
            value={formatCurrency(summary.totalINSSBase)}
            subtitle='Total de base consolidada'
            tone='amber'
          />
          <SummaryCard
            title='Encargos'
            value={formatCurrency(summary.totalCharges)}
            subtitle='Estimativa consolidada'
            tone='violet'
          />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Ano
              </label>
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Status da competencia
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                <option value='ABERTA'>Aberta</option>
                <option value='PROCESSADA'>Processada</option>
                <option value='FECHADA'>Fechada</option>
                <option value='REABERTA'>Reaberta</option>
              </select>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-sm font-semibold text-slate-700'>
                Leitura do modulo
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                Encargos refletem a consolidacao da competencia processada e
                preparam a base para exportacoes e conferencias futuras.
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('list')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Lista
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('cards')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'cards'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Visao detalhada
            </button>
          </div>
        </div>

        {activeTab === 'list' && renderList()}
        {activeTab === 'cards' && renderCards()}
      </div>

      {details && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={() => setDetails(null)}
          />

          <div className='relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl'>
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 px-6 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100'>
                    Detalhamento de encargos
                  </div>
                  <h3 className='text-2xl font-bold'>{details.competence}</h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    {details.companyName} - {details.processedEmployees}/
                    {details.totalEmployees} colaborador(es) processado(s)
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setDetails(null)}
                  className='rounded-xl px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='max-h-[80vh] overflow-y-auto px-6 py-6'>
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                <div className='space-y-4'>
                  <SummaryCard
                    title='Encargos totais'
                    value={formatCurrency(details.totals.totalCharges)}
                    subtitle='Consolidado estimado da competencia'
                    tone='green'
                  />
                  <SummaryCard
                    title='Bruto total'
                    value={formatCurrency(details.totals.totalGross)}
                    subtitle='Soma de proventos processados'
                    tone='blue'
                  />
                  <SummaryCard
                    title='Descontos'
                    value={formatCurrency(details.totals.totalDiscounts)}
                    subtitle='Soma de descontos processados'
                    tone='amber'
                  />
                </div>

                <div className='space-y-4'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                    <p className='text-sm font-semibold text-slate-700'>
                      Bases consolidadas
                    </p>

                    <div className='mt-4 grid grid-cols-1 gap-4'>
                      <InfoBox
                        label='Base INSS'
                        value={formatCurrency(details.bases.inssBase)}
                      />
                      <InfoBox
                        label='Base FGTS'
                        value={formatCurrency(details.bases.fgtsBase)}
                      />
                      <InfoBox
                        label='Base IRRF'
                        value={formatCurrency(details.bases.irrfBase)}
                      />
                    </div>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                    <p className='text-sm font-semibold text-slate-700'>
                      Estimativas por categoria
                    </p>

                    <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
                      <MiniInfo
                        label='INSS'
                        value={formatCurrency(details.bases.inssAmount)}
                      />
                      <MiniInfo
                        label='FGTS'
                        value={formatCurrency(details.bases.fgtsAmount)}
                      />
                      <MiniInfo
                        label='IRRF est.'
                        value={formatCurrency(details.bases.irrfEstimatedAmount)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <div>
                    <p className='text-sm font-semibold text-slate-700'>
                      Status da conferencia
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Gerado em {formatDateTime(details.generatedAt)} - fechado em{' '}
                      {formatDateTime(details.closedAt)}
                    </p>
                  </div>

                  <ConferenceBadge status={details.conferenceStatus} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const initialSummary = () => ({
  totalCompetences: 0,
  readyForConference: 0,
  checkedCompetences: 0,
  totalCharges: 0,
  totalINSSBase: 0,
  totalFGTSBase: 0,
  totalIRRFBase: 0,
});

const MiniInfo = ({ label, value }) => (
  <div className='rounded-xl border border-slate-200 bg-white p-4'>
    <p className='text-sm text-slate-500'>{label}</p>
    <p className='mt-1 font-semibold text-slate-800'>{value}</p>
  </div>
);

const ActionButton = ({ label, tone = 'blue', onClick }) => {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tones[tone]}`}
    >
      {label}
    </button>
  );
};

const MiniActionButton = ({ label, tone = 'blue', onClick }) => {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${tones[tone]}`}
    >
      {label}
    </button>
  );
};

export default PayrollCharges;
