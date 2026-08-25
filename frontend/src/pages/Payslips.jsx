import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const months = [
  { value: 'TODOS', label: 'Todos' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Marco' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

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

const StatusBadge = ({ status }) => {
  const tones = {
    PENDENTE: 'border border-amber-200 bg-amber-50 text-amber-700',
    PROCESSADO: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    INCONSISTENTE: 'border border-red-200 bg-red-50 text-red-700',
    BLOQUEADO: 'border border-slate-300 bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        tones[status] || 'border border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {status || 'SEM STATUS'}
    </span>
  );
};

function Payslips() {
  const { hasPermission } = useAuthSession();
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState({
    totalPayslips: 0,
    totalEmployees: 0,
    totalNet: 0,
    totalGross: 0,
    latestCompetence: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('TODOS');
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pdfActionKey, setPdfActionKey] = useState(null);

  const canReadPayslips = hasPermission('payroll.payslip.read');
  const canExportPayslips = hasPermission('payroll.payslip.export');

  useEffect(() => {
    fetchPayslips();
  }, [search, monthFilter, yearFilter, statusFilter]);

  const fetchPayslips = async () => {
    if (!canReadPayslips) {
      setPayslips([]);
      setSummary(initialSummary());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (monthFilter !== 'TODOS') params.month = monthFilter;
      if (yearFilter !== 'TODOS') params.year = yearFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;

      const response = await api.get('/payroll/payslips', { params });
      setPayslips(response.data?.payslips || []);
      setSummary(response.data?.summary || initialSummary());
    } catch (error) {
      console.error('Erro ao carregar holerites:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar os holerites.'
      );
      setPayslips([]);
      setSummary(initialSummary());
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    const values = new Set(
      payslips.map((item) => {
        const [, year] = String(item.competence || '').split('/');
        return year;
      })
    );

    values.add(String(new Date().getFullYear()));
    values.add(String(new Date().getFullYear() - 1));

    return Array.from(values).filter(Boolean).sort((a, b) => Number(b) - Number(a));
  }, [payslips]);

  const groupedByCompetence = useMemo(() => {
    return payslips.reduce((acc, item) => {
      if (!acc[item.competence]) {
        acc[item.competence] = [];
      }

      acc[item.competence].push(item);
      return acc;
    }, {});
  }, [payslips]);

  const handleOpenPreview = async (payslip) => {
    try {
      setLoadingPreview(true);
      const response = await api.get(
        `/payroll/runs/${payslip.payrollRunId}/payslips/${payslip.employee.id}`
      );
      setPreview(response.data?.payslip || null);
    } catch (error) {
      console.error('Erro ao abrir preview do holerite:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel abrir o preview do holerite.'
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGeneratePdf = async (payslip, mode = 'view') => {
    const actionKey = `${mode}-${payslip.payrollRunId}-${payslip.employee.id}`;

    try {
      setPdfActionKey(actionKey);
      const { downloadPdfFromEndpoint, openPdfFromEndpoint } = await import(
        '../utils/pdfActions'
      );

      const response = await api.post(
        `/pdf/payslips/${payslip.payrollRunId}/${payslip.employee.id}`
      );
      const pdf = response.data?.pdf;

      if (!pdf) {
        throw new Error('PDF nao retornado pelo servidor.');
      }

      if (mode === 'download') {
        await downloadPdfFromEndpoint(
          pdf.downloadUrl,
          `holerite-${payslip.competence}-${payslip.employee.name}.pdf`
        );
        return;
      }

      await openPdfFromEndpoint(pdf.viewUrl);
    } catch (error) {
      console.error('Erro ao gerar PDF do holerite:', error);
      alert(error?.response?.data?.message || 'Nao foi possivel gerar o PDF.');
    } finally {
      setPdfActionKey(null);
    }
  };

  const renderCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando holerites...
        </div>
      );
    }

    if (payslips.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum holerite encontrado para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {Object.entries(groupedByCompetence).map(([competence, competencePayslips]) => (
          <div
            key={competence}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-slate-50 px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Competencia
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-slate-900'>
                    {competence}
                  </h3>
                  <p className='mt-1 text-sm text-slate-500'>
                    {competencePayslips.length} demonstrativo(s) disponivel(is)
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Liquido consolidado
                  </p>
                  <p className='mt-1 text-lg font-bold text-slate-900'>
                    {formatCurrency(
                      competencePayslips.reduce(
                        (total, item) => total + Number(item.totals.netAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 p-5 xl:grid-cols-2'>
              {competencePayslips.map((payslip) => (
                <div
                  key={`${payslip.payrollRunId}-${payslip.employee.id}`}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h4 className='text-xl font-bold text-slate-900'>
                        {payslip.employee.name}
                      </h4>
                      <p className='mt-1 text-sm text-slate-500'>
                        {payslip.employee.role || 'Sem cargo'} -{' '}
                        {payslip.employee.department || 'Sem departamento'}
                      </p>
                    </div>

                    <StatusBadge status={payslip.status} />
                  </div>

                  <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
                    <MiniInfo
                      label='Proventos'
                      value={formatCurrency(payslip.totals.grossAmount)}
                    />
                    <MiniInfo
                      label='Descontos'
                      value={formatCurrency(payslip.totals.discountAmount)}
                    />
                    <MiniInfo
                      label='Liquido'
                      value={formatCurrency(payslip.totals.netAmount)}
                    />
                  </div>

                  <div className='mt-4 flex flex-wrap gap-3'>
                    <ActionButton
                      label={loadingPreview ? 'Abrindo...' : 'Visualizar'}
                      tone='blue'
                      onClick={() => handleOpenPreview(payslip)}
                    />
                    {canExportPayslips ? (
                      <>
                        <ActionButton
                          label={
                            pdfActionKey ===
                            `view-${payslip.payrollRunId}-${payslip.employee.id}`
                              ? 'Gerando...'
                              : 'Gerar PDF'
                          }
                          tone='violet'
                          onClick={() => handleGeneratePdf(payslip, 'view')}
                        />
                        <ActionButton
                          label={
                            pdfActionKey ===
                            `download-${payslip.payrollRunId}-${payslip.employee.id}`
                              ? 'Baixando...'
                              : 'Baixar PDF'
                          }
                          tone='slate'
                          onClick={() => handleGeneratePdf(payslip, 'download')}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
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
          Carregando holerites...
        </div>
      );
    }

    if (payslips.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum holerite encontrado para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Historico de holerites
          </h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Colaborador
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Competencia
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Proventos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Descontos
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Liquido
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Status
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
              {payslips.map((payslip) => (
                <tr
                  key={`${payslip.payrollRunId}-${payslip.employee.id}`}
                  className='hover:bg-slate-50/70'
                >
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>
                        {payslip.employee.name}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {payslip.employee.role || 'Sem cargo'}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm font-semibold text-slate-700'>
                    {payslip.competence}
                  </td>
                  <td className='px-6 py-5 text-sm text-emerald-700'>
                    {formatCurrency(payslip.totals.grossAmount)}
                  </td>
                  <td className='px-6 py-5 text-sm text-rose-700'>
                    {formatCurrency(payslip.totals.discountAmount)}
                  </td>
                  <td className='px-6 py-5 text-sm font-bold text-slate-800'>
                    {formatCurrency(payslip.totals.netAmount)}
                  </td>
                  <td className='px-6 py-5'>
                    <StatusBadge status={payslip.status} />
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-600'>
                    {formatDateTime(payslip.generatedAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      <MiniActionButton
                        label={loadingPreview ? 'Abrindo...' : 'Visualizar'}
                        tone='blue'
                        onClick={() => handleOpenPreview(payslip)}
                      />
                      {canExportPayslips ? (
                        <>
                          <MiniActionButton
                            label={
                              pdfActionKey ===
                              `view-${payslip.payrollRunId}-${payslip.employee.id}`
                                ? 'Gerando...'
                                : 'PDF'
                            }
                            tone='violet'
                            onClick={() => handleGeneratePdf(payslip, 'view')}
                          />
                          <MiniActionButton
                            label={
                              pdfActionKey ===
                              `download-${payslip.payrollRunId}-${payslip.employee.id}`
                                ? 'Baixando...'
                                : 'Baixar'
                            }
                            tone='slate'
                            onClick={() => handleGeneratePdf(payslip, 'download')}
                          />
                        </>
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

  if (!canReadPayslips) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm'>
        <p className='text-sm font-semibold uppercase tracking-[0.2em]'>
          Departamento Pessoal
        </p>
        <h1 className='mt-3 text-3xl font-bold'>Holerites</h1>
        <p className='mt-3 text-base'>
          Seu perfil nao possui acesso para consultar os demonstrativos da
          folha.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-800 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
                Departamento Pessoal
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Holerites
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Consulte demonstrativos por colaborador e competencia, com
                preview premium conectado ao resultado real da folha
                processada.
              </p>
            </div>

            <div className='rounded-2xl border border-white/15 bg-white/10 px-5 py-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                Ultima competencia
              </p>
              <p className='mt-2 text-2xl font-bold'>
                {summary.latestCompetence || 'Sem processamento'}
              </p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <SummaryCard
            title='Total'
            value={summary.totalPayslips}
            subtitle='Demonstrativos encontrados'
            tone='slate'
          />
          <SummaryCard
            title='Colaboradores'
            value={summary.totalEmployees}
            subtitle='Pessoas com preview disponivel'
            tone='blue'
          />
          <SummaryCard
            title='Bruto'
            value={formatCurrency(summary.totalGross)}
            subtitle='Total consolidado de proventos'
            tone='green'
          />
          <SummaryCard
            title='Liquido'
            value={formatCurrency(summary.totalNet)}
            subtitle='Total liquido consultavel'
            tone='violet'
          />
          <SummaryCard
            title='Previews'
            value={payslips.filter((item) => item.status === 'PROCESSADO').length}
            subtitle='Holerites prontos para conferenca'
            tone='amber'
          />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
            <div className='lg:col-span-2'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Buscar por colaborador, cpf, email ou competencia'
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Mes
              </label>
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {months.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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

            <div className='lg:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-sm font-semibold text-slate-700'>
                Uso operacional
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                Os holerites desta tela consomem o processamento real da
                competencia e exibem preview pronto para exportacao futura.
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
              Por competencia
            </button>
          </div>
        </div>

        {activeTab === 'list' && renderList()}
        {activeTab === 'cards' && renderCards()}
      </div>

      {preview && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={() => setPreview(null)}
          />

          <div className='relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl'>
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100'>
                    Preview do holerite
                  </div>
                  <h3 className='text-2xl font-bold'>
                    {preview.employee.name}
                  </h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    Competencia {preview.competence} - {preview.companyName}
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setPreview(null)}
                  className='rounded-xl px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='max-h-[80vh] overflow-y-auto px-6 py-6'>
              <div className='grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
                <div className='space-y-4'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                    <p className='text-sm text-slate-500'>Colaborador</p>
                    <p className='mt-1 text-lg font-bold text-slate-900'>
                      {preview.employee.name}
                    </p>
                    <p className='mt-2 text-sm text-slate-600'>
                      {preview.employee.role || 'Sem cargo'} -{' '}
                      {preview.employee.department || 'Sem setor'}
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      CPF: {preview.employee.cpf || '-'}
                    </p>
                  </div>

                  <div className='grid grid-cols-1 gap-4'>
                    <SummaryCard
                      title='Bruto'
                      value={formatCurrency(preview.totals.grossAmount)}
                      subtitle='Proventos consolidados'
                      tone='green'
                    />
                    <SummaryCard
                      title='Descontos'
                      value={formatCurrency(preview.totals.discountAmount)}
                      subtitle='Total de descontos'
                      tone='amber'
                    />
                    <SummaryCard
                      title='Liquido'
                      value={formatCurrency(preview.totals.netAmount)}
                      subtitle='Resultado final da previa'
                      tone='blue'
                    />
                  </div>
                </div>

                <div className='space-y-6'>
                  <PayslipSection
                    title='Proventos'
                    tone='emerald'
                    lines={preview.provents}
                  />
                  <PayslipSection
                    title='Descontos'
                    tone='rose'
                    lines={preview.discounts}
                  />
                  {preview.informative?.length > 0 ? (
                    <PayslipSection
                      title='Informativos'
                      tone='blue'
                      lines={preview.informative}
                    />
                  ) : null}
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
  totalPayslips: 0,
  totalEmployees: 0,
  totalNet: 0,
  totalGross: 0,
  latestCompetence: null,
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
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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

const PayslipSection = ({ title, tone = 'emerald', lines = [] }) => {
  const styles = {
    emerald: {
      wrapper: 'rounded-3xl border border-emerald-200 bg-emerald-50 p-5',
      title: 'text-emerald-900',
      total: 'text-emerald-700',
      item: 'rounded-2xl border border-emerald-200 bg-white px-4 py-3',
    },
    rose: {
      wrapper: 'rounded-3xl border border-rose-200 bg-rose-50 p-5',
      title: 'text-rose-900',
      total: 'text-rose-700',
      item: 'rounded-2xl border border-rose-200 bg-white px-4 py-3',
    },
    blue: {
      wrapper: 'rounded-3xl border border-blue-200 bg-blue-50 p-5',
      title: 'text-blue-900',
      total: 'text-blue-700',
      item: 'rounded-2xl border border-blue-200 bg-white px-4 py-3',
    },
  };

  const current = styles[tone];

  return (
    <div className={current.wrapper}>
      <h4 className={`text-lg font-bold ${current.title}`}>{title}</h4>
      <div className='mt-4 space-y-3'>
        {lines.length === 0 ? (
          <p className='text-sm text-slate-500'>Nenhum item encontrado.</p>
        ) : (
          lines.map((line, index) => (
            <div
              key={`${line.code}-${index}`}
              className={`flex items-center justify-between gap-4 ${current.item}`}
            >
              <div>
                <p className='font-semibold text-slate-900'>{line.name}</p>
                <p className='mt-1 text-xs text-slate-500'>
                  {line.code} - {line.category}
                </p>
              </div>

              <p className={`text-sm font-bold ${current.total}`}>
                {formatCurrency(line.totalValue)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Payslips;
