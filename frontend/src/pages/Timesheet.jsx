import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const importStatusConfig = {
  PREVIEW: {
    label: 'Prévia',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
  },
  IMPORTADO: {
    label: 'Importado',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  ERRO: {
    label: 'Erro',
    badge: 'border border-red-200 bg-red-50 text-red-700',
  },
  ARQUIVADO: {
    label: 'Arquivado',
    badge: 'border border-slate-300 bg-slate-100 text-slate-700',
  },
};

const validationStatusConfig = {
  VALIDO: {
    label: 'Válido',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  PENDENTE_VINCULO: {
    label: 'Pendente de vínculo',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  INVALIDO: {
    label: 'Inválido',
    badge: 'border border-red-200 bg-red-50 text-red-700',
  },
  DUPLICADO: {
    label: 'Duplicado',
    badge: 'border border-violet-200 bg-violet-50 text-violet-700',
  },
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const formatMinutes = (minutes) => {
  const total = Number(minutes || 0);
  const signal = total < 0 ? '-' : '';
  const absolute = Math.abs(total);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${signal}${String(hours).padStart(2, '0')}h ${String(remainder).padStart(2, '0')}m`;
};

const StatusBadge = ({ status, configMap }) => {
  const current = configMap[status] || {
    label: status || 'Não definido',
    badge: 'border border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.badge}`}
    >
      {current.label}
    </span>
  );
};

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

const initialImportForm = {
  source: 'MYAHGORA',
  notes: '',
  file: null,
};

function Timesheet() {
  const { hasPermission } = useAuthSession();
  const [activeTab, setActiveTab] = useState('list');
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const [options, setOptions] = useState({ employees: [], departments: [], sources: [] });
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryCards, setSummaryCards] = useState({
    totalEmployees: 0,
    totalWorkedMinutes: 0,
    totalOvertimeMinutes: 0,
    totalDelayMinutes: 0,
    totalAbsenceMinutes: 0,
    totalBankHoursMinutes: 0,
    pendingLinks: 0,
    recognizedEmployees: 0,
    importedRows: 0,
    lastImportAt: null,
  });
  const [payrollSync, setPayrollSync] = useState({
    status: 'NO_PAYROLL_RUN',
    referenceLabel: null,
    generatedMovements: 0,
    lastSyncAt: null,
  });
  const [batches, setBatches] = useState([]);
  const [batchSummary, setBatchSummary] = useState({
    totalBatches: 0,
    importedBatches: 0,
    previewBatches: 0,
    pendingRows: 0,
    invalidRows: 0,
    lastImportAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resolvingEntryId, setResolvingEntryId] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [previewBatch, setPreviewBatch] = useState(null);
  const [importForm, setImportForm] = useState(initialImportForm);
  const [resolveSelections, setResolveSelections] = useState({});

  const canRead = hasPermission('time.read');
  const canImport = hasPermission('time.import');
  const canReview = hasPermission('time.review');

  const refreshData = async () => {
    try {
      setLoading(true);
      const params = {
        month: monthFilter,
        year: yearFilter,
      };

      if (search.trim()) params.search = search.trim();
      if (departmentFilter !== 'TODOS') params.department = departmentFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;

      const [summaryResponse, importsResponse, optionsResponse] = await Promise.all([
        api.get('/time/summary', { params }),
        api.get('/time/imports', { params }),
        api.get('/time/options'),
      ]);

      setSummaryRows(summaryResponse.data?.summaries || []);
      setSummaryCards(
        summaryResponse.data?.summary || {
          totalEmployees: 0,
          totalWorkedMinutes: 0,
          totalOvertimeMinutes: 0,
          totalDelayMinutes: 0,
          totalAbsenceMinutes: 0,
          totalBankHoursMinutes: 0,
          pendingLinks: 0,
          recognizedEmployees: 0,
          importedRows: 0,
          lastImportAt: null,
        }
      );
      setPayrollSync(
        summaryResponse.data?.payrollSync || {
          status: 'NO_PAYROLL_RUN',
          referenceLabel: null,
          generatedMovements: 0,
          lastSyncAt: null,
        }
      );
      setBatches(importsResponse.data?.batches || []);
      setBatchSummary(
        importsResponse.data?.summary || {
          totalBatches: 0,
          importedBatches: 0,
          previewBatches: 0,
          pendingRows: 0,
          invalidRows: 0,
          lastImportAt: null,
        }
      );
      setOptions(
        optionsResponse.data || { employees: [], departments: [], sources: [] }
      );
    } catch (error) {
      console.error('Erro ao carregar dados de jornada:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível carregar o módulo de jornada.'
      );
      setSummaryRows([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    refreshData();
  }, [monthFilter, yearFilter, search, departmentFilter, statusFilter]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 4 }).map((_, index) => currentYear - index);
  }, []);

  const openImportDrawer = () => {
    setPreviewBatch(null);
    setImportForm(initialImportForm);
    setIsImportDrawerOpen(true);
  };

  const closeImportDrawer = () => {
    setImportForm(initialImportForm);
    setPreviewBatch(null);
    setIsImportDrawerOpen(false);
  };

  const handleImportChange = (event) => {
    const { name, value, files } = event.target;

    if (name === 'file') {
      setImportForm((prev) => ({
        ...prev,
        file: files?.[0] || null,
      }));
      return;
    }

    setImportForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePreviewImport = async (event) => {
    event.preventDefault();

    if (!importForm.file) {
      alert('Selecione um arquivo CSV, XLSX ou compatível para importar.');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importForm.file);
      formData.append('source', importForm.source);
      formData.append('notes', importForm.notes);

      const response = await api.post('/time/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreviewBatch(response.data?.batch || null);
      if (response.data?.batch) {
        setResolveSelections(
          Object.fromEntries(
            (response.data.batch.entries || []).map((entry) => [
              entry.id,
              entry.employee?.id ? String(entry.employee.id) : '',
            ])
          )
        );
      }
      await refreshData();
    } catch (error) {
      console.error('Erro ao gerar prévia de importação:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível gerar a prévia da importação.'
      );
    } finally {
      setImporting(false);
    }
  };

  const loadBatchDetails = async (batchId) => {
    try {
      const response = await api.get(`/time/imports/${batchId}`);
      const nextBatch = response.data?.batch || null;
      setSelectedBatch(nextBatch);
      setResolveSelections(
        Object.fromEntries(
          (nextBatch?.entries || []).map((entry) => [
            entry.id,
            entry.employee?.id ? String(entry.employee.id) : '',
          ])
        )
      );
      setIsBatchDrawerOpen(true);
    } catch (error) {
      console.error('Erro ao carregar lote de importação:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível carregar o detalhe da importação.'
      );
    }
  };

  const handleConfirmImport = async (batchId) => {
    try {
      setConfirming(true);
      await api.post(`/time/imports/${batchId}/confirm`);
      await refreshData();

      if (previewBatch?.id === batchId) {
        closeImportDrawer();
      }

      if (selectedBatch?.id === batchId) {
        await loadBatchDetails(batchId);
      }
    } catch (error) {
      console.error('Erro ao confirmar importação:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível confirmar a importação.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleResolveEntry = async (batchId, entryId) => {
    const employeeId = resolveSelections[entryId];

    if (!employeeId) {
      alert('Selecione um colaborador para resolver o vínculo.');
      return;
    }

    try {
      setResolvingEntryId(entryId);
      await api.patch(`/time/imports/${batchId}/entries/${entryId}/resolve`, {
        employeeId: Number(employeeId),
      });

      await refreshData();

      if (previewBatch?.id === batchId) {
        const previewResponse = await api.get(`/time/imports/${batchId}`);
        setPreviewBatch(previewResponse.data?.batch || null);
      }

      if (selectedBatch?.id === batchId) {
        await loadBatchDetails(batchId);
      }
    } catch (error) {
      console.error('Erro ao resolver pendência de vínculo:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível atualizar o vínculo da linha importada.'
      );
    } finally {
      setResolvingEntryId(null);
    }
  };

  const previewPendingEntries = useMemo(
    () =>
      (previewBatch?.entries || []).filter(
        (entry) => entry.validationStatus === 'PENDENTE_VINCULO'
      ),
    [previewBatch]
  );

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
            Sua conta ainda não possui permissão para consultar a Folha de Ponto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <section className='rounded-[2rem] border border-cyan-200 bg-cyan-50 p-5 shadow-sm'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700'>
                Reflexo na Folha de Pagamento
              </p>
              <h3 className='mt-2 text-xl font-bold text-slate-900'>
                {payrollSync.status === 'SYNCED'
                  ? `Periodo enviado para a competencia ${payrollSync.referenceLabel}`
                  : payrollSync.status === 'READY'
                    ? `Competencia ${payrollSync.referenceLabel} pronta para receber Jornada`
                    : 'Abra a competencia da folha para sincronizar este periodo'}
              </h3>
              <p className='mt-2 text-sm text-cyan-800'>
                {payrollSync.status === 'SYNCED'
                  ? `${payrollSync.generatedMovements} lancamento(s) automatico(s) estao ativos na folha.`
                  : 'A sincronizacao e feita dentro da competencia da Folha, preservando revisao humana e auditoria.'}
              </p>
            </div>

            <div className='rounded-2xl border border-cyan-200 bg-white px-5 py-4 text-right'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700'>
                Ultima sincronizacao
              </p>
              <p className='mt-1 text-sm font-bold text-slate-900'>
                {formatDateTime(payrollSync.lastSyncAt)}
              </p>
            </div>
          </div>
        </section>

        <section className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-8 py-8 text-white'>
            <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
              <div className='max-w-3xl'>
                <div className='mb-3 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100'>
                  Jornada conectada ao MyAhgora / TOTVS
                </div>
                <h1 className='text-4xl font-black tracking-tight'>
                  Folha de Ponto
                </h1>
                <p className='mt-3 text-lg text-slate-200'>
                  Importe relatórios exportados, valide pendências, consolide a
                  jornada por colaborador e prepare a base do banco de horas com
                  rastreabilidade operacional.
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                {canImport ? (
                  <button
                    type='button'
                    onClick={openImportDrawer}
                    className='rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100'
                  >
                    Importar relatório
                  </button>
                ) : null}

                <button
                  type='button'
                  onClick={() => setActiveTab('imports')}
                  className='rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15'
                >
                  Ver histórico
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className='grid grid-cols-1 gap-4 xl:grid-cols-6'>
          <InfoCard
            title='Última importação'
            value={summaryCards.lastImportAt ? formatDate(summaryCards.lastImportAt) : '-'}
            subtitle='Data de referência mais recente'
            tone='slate'
          />
          <InfoCard
            title='Colaboradores identificados'
            value={summaryCards.totalEmployees}
            subtitle='Consolidados no período filtrado'
            tone='blue'
          />
          <InfoCard
            title='Registros importados'
            value={summaryCards.importedRows}
            subtitle='Linhas recebidas pelos lotes'
            tone='green'
          />
          <InfoCard
            title='Pendências de vínculo'
            value={summaryCards.pendingLinks}
            subtitle='Linhas aguardando conferência'
            tone='amber'
          />
          <InfoCard
            title='Horas extras'
            value={formatMinutes(summaryCards.totalOvertimeMinutes)}
            subtitle='Excedentes reconhecidos no período'
            tone='violet'
          />
          <InfoCard
            title='Faltas e ausências'
            value={formatMinutes(summaryCards.totalAbsenceMinutes)}
            subtitle='Base para tratativas e folha'
            tone='rose'
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
                placeholder='Ex.: Gabriel, Suporte, Técnico...'
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

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Departamento
              </label>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Status do lote
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {Object.keys(importStatusConfig).map((status) => (
                  <option key={status} value={status}>
                    {importStatusConfig[status].label}
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
              onClick={() => setActiveTab('imports')}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === 'imports'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Histórico de importações
            </button>
          </div>
        </section>

        {activeTab === 'list' && (
          <section className='rounded-[2rem] border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 px-8 py-6'>
              <h2 className='text-3xl font-bold text-slate-900'>
                Consolidação da Folha de Ponto
              </h2>
              <p className='mt-2 text-sm text-slate-500'>
                Visão consolidada por colaborador e período, pronta para tratativas
                operacionais e evolução futura com a folha.
              </p>
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200'>
                <thead className='bg-slate-50'>
                  <tr className='text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                    <th className='px-8 py-4'>Colaborador</th>
                    <th className='px-6 py-4'>Setor</th>
                    <th className='px-6 py-4'>Trabalhadas</th>
                    <th className='px-6 py-4'>Extras</th>
                    <th className='px-6 py-4'>Atrasos</th>
                    <th className='px-6 py-4'>Ausências</th>
                    <th className='px-6 py-4'>Saldo do período</th>
                    <th className='px-8 py-4 text-right'>Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200'>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-8 py-12 text-center text-sm text-slate-500'
                      >
                        Carregando consolidação da jornada...
                      </td>
                    </tr>
                  ) : summaryRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-8 py-12 text-center text-sm text-slate-500'
                      >
                        Nenhum registro consolidado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    summaryRows.map((row) => (
                      <tr key={row.id} className='align-top text-sm text-slate-700'>
                        <td className='px-8 py-5'>
                          <div>
                            <p className='text-base font-bold text-slate-900'>
                              {row.employeeName}
                            </p>
                            <p className='mt-1 text-xs text-slate-500'>
                              {row.role} • {row.employeeCpf || 'CPF não informado'}
                            </p>
                          </div>
                        </td>
                        <td className='px-6 py-5'>{row.department}</td>
                        <td className='px-6 py-5 font-semibold text-slate-900'>
                          {formatMinutes(row.workedMinutes)}
                        </td>
                        <td className='px-6 py-5 text-emerald-700'>
                          {formatMinutes(row.overtimeMinutes)}
                        </td>
                        <td className='px-6 py-5 text-amber-700'>
                          {formatMinutes(row.delayMinutes)}
                        </td>
                        <td className='px-6 py-5 text-rose-700'>
                          {formatMinutes(row.absenceMinutes)}
                        </td>
                        <td className='px-6 py-5 font-semibold text-cyan-700'>
                          {formatMinutes(row.bankHoursMinutes)}
                        </td>
                        <td className='px-8 py-5 text-right font-bold text-slate-900'>
                          {formatMinutes(row.closingBalanceMinutes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'imports' && (
          <section className='rounded-[2rem] border border-slate-200 bg-white shadow-sm'>
            <div className='border-b border-slate-200 px-8 py-6'>
              <div className='flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between'>
                <div>
                  <h2 className='text-3xl font-bold text-slate-900'>
                    Histórico de importações
                  </h2>
                  <p className='mt-2 text-sm text-slate-500'>
                    Cada lote fica rastreado com status, pendências, linha de origem
                    e data de consolidação.
                  </p>
                </div>

                {canImport ? (
                  <button
                    type='button'
                    onClick={openImportDrawer}
                    className='rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800'
                  >
                    Nova importação
                  </button>
                ) : null}
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 border-b border-slate-200 px-8 py-5 md:grid-cols-5'>
              <InfoCard
                title='Lotes'
                value={batchSummary.totalBatches}
                subtitle='Total no contexto filtrado'
                tone='slate'
              />
              <InfoCard
                title='Importados'
                value={batchSummary.importedBatches}
                subtitle='Lotes já consolidados'
                tone='green'
              />
              <InfoCard
                title='Prévia em aberto'
                value={batchSummary.previewBatches}
                subtitle='Aguardando revisão'
                tone='blue'
              />
              <InfoCard
                title='Pendências'
                value={batchSummary.pendingRows}
                subtitle='Linhas sem vínculo automático'
                tone='amber'
              />
              <InfoCard
                title='Inválidas'
                value={batchSummary.invalidRows}
                subtitle='Linhas bloqueadas na validação'
                tone='rose'
              />
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200'>
                <thead className='bg-slate-50'>
                  <tr className='text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                    <th className='px-8 py-4'>Importação</th>
                    <th className='px-6 py-4'>Origem</th>
                    <th className='px-6 py-4'>Status</th>
                    <th className='px-6 py-4'>Linhas</th>
                    <th className='px-6 py-4'>Reconhecidos</th>
                    <th className='px-6 py-4'>Pendências</th>
                    <th className='px-6 py-4'>Responsável</th>
                    <th className='px-8 py-4 text-right'>Ações</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200'>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-8 py-12 text-center text-sm text-slate-500'
                      >
                        Carregando histórico...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-8 py-12 text-center text-sm text-slate-500'
                      >
                        Nenhuma importação registrada para os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className='align-top text-sm text-slate-700'>
                        <td className='px-8 py-5'>
                          <p className='font-semibold text-slate-900'>
                            {batch.originalName}
                          </p>
                          <p className='mt-1 text-xs text-slate-500'>
                            {formatDateTime(batch.createdAt)}
                          </p>
                        </td>
                        <td className='px-6 py-5'>{batch.source}</td>
                        <td className='px-6 py-5'>
                          <StatusBadge
                            status={batch.status}
                            configMap={importStatusConfig}
                          />
                        </td>
                        <td className='px-6 py-5 font-semibold text-slate-900'>
                          {batch.totalRows}
                        </td>
                        <td className='px-6 py-5'>{batch.recognizedEmployees}</td>
                        <td className='px-6 py-5'>{batch.pendingRows}</td>
                        <td className='px-6 py-5'>
                          {batch.importedByUser?.name || batch.importedByUser?.email || '-'}
                        </td>
                        <td className='px-8 py-5'>
                          <div className='flex justify-end gap-2'>
                            <button
                              type='button'
                              onClick={() => loadBatchDetails(batch.id)}
                              className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                            >
                              Ver detalhes
                            </button>

                            {canReview && batch.status === 'PREVIEW' ? (
                              <button
                                type='button'
                                onClick={() => handleConfirmImport(batch.id)}
                                disabled={confirming}
                                className='rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60'
                              >
                                {confirming ? 'Confirmando...' : 'Confirmar'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {isImportDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeImportDrawer}
          />

          <div className='relative flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700'>
                    Pipeline de importação
                  </div>
                  <h2 className='text-2xl font-bold text-slate-800'>
                    Importar relatório MyAhgora / TOTVS
                  </h2>
                  <p className='mt-1 text-sm text-slate-500'>
                    Envie o arquivo exportado, valide o mapeamento e confirme a
                    consolidação apenas depois da prévia.
                  </p>
                </div>

                <button
                  type='button'
                  onClick={closeImportDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-6'>
              <div className='space-y-6'>
                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <form onSubmit={handlePreviewImport} className='space-y-5'>
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Origem do relatório
                        </label>
                        <select
                          name='source'
                          value={importForm.source}
                          onChange={handleImportChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {(options.sources.length
                            ? options.sources
                            : [
                                { value: 'MYAHGORA', label: 'MyAhgora / TOTVS' },
                                { value: 'TOTVS', label: 'TOTVS' },
                                { value: 'MANUAL', label: 'Manual / Outro formato' },
                              ]
                          ).map((source) => (
                            <option key={source.value} value={source.value}>
                              {source.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Arquivo do relatório
                        </label>
                        <input
                          type='file'
                          name='file'
                          accept='.csv,.xlsx,.xls,.txt'
                          onChange={handleImportChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observações da carga
                        </label>
                        <textarea
                          name='notes'
                          value={importForm.notes}
                          onChange={handleImportChange}
                          rows='3'
                          placeholder='Ex.: fechamento da primeira quinzena, relatório ajustado pela operação, exportação manual do TOTVS.'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>
                    </div>

                    <div className='flex justify-end gap-3'>
                      <button
                        type='button'
                        onClick={closeImportDrawer}
                        className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Cancelar
                      </button>

                      <button
                        type='submit'
                        disabled={importing}
                        className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {importing ? 'Gerando prévia...' : 'Gerar prévia'}
                      </button>
                    </div>
                  </form>
                </section>

                {previewBatch && (
                  <>
                    <section className='grid grid-cols-1 gap-4 md:grid-cols-5'>
                      <InfoCard
                        title='Linhas'
                        value={previewBatch.totalRows}
                        subtitle='Total lido do arquivo'
                        tone='slate'
                      />
                      <InfoCard
                        title='Válidas'
                        value={previewBatch.validRows}
                        subtitle='Prontas para consolidar'
                        tone='green'
                      />
                      <InfoCard
                        title='Pendentes'
                        value={previewBatch.pendingRows}
                        subtitle='Aguardando vínculo manual'
                        tone='amber'
                      />
                      <InfoCard
                        title='Inválidas'
                        value={previewBatch.invalidRows}
                        subtitle='Barradas na validação'
                        tone='rose'
                      />
                      <InfoCard
                        title='Duplicadas'
                        value={previewBatch.duplicateRows}
                        subtitle='Já existentes ou repetidas'
                        tone='violet'
                      />
                    </section>

                    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                      <div className='mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                        <div>
                          <h3 className='text-lg font-semibold text-slate-800'>
                            Amostra da importação
                          </h3>
                          <p className='mt-1 text-sm text-slate-500'>
                            Revise o lote antes da confirmação. As linhas pendentes
                            podem ser vinculadas manualmente aqui mesmo.
                          </p>
                        </div>

                        {canReview ? (
                          <button
                            type='button'
                            onClick={() => handleConfirmImport(previewBatch.id)}
                            disabled={confirming}
                            className='rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
                          >
                            {confirming ? 'Confirmando lote...' : 'Confirmar importação'}
                          </button>
                        ) : null}
                      </div>

                      <div className='space-y-4'>
                        {(previewBatch.previewSample || []).map((entry) => (
                          <div
                            key={entry.id}
                            className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                          >
                            <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                              <div>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <p className='text-base font-bold text-slate-900'>
                                    {entry.employeeNameSnapshot || 'Colaborador não identificado'}
                                  </p>
                                  <StatusBadge
                                    status={entry.validationStatus}
                                    configMap={validationStatusConfig}
                                  />
                                </div>
                                <p className='mt-2 text-sm text-slate-500'>
                                  Linha {entry.sourceRowNumber} • {formatDate(entry.workDate)} •
                                  Trabalhadas {formatMinutes(entry.workedMinutes)} • Extras{' '}
                                  {formatMinutes(entry.overtimeMinutes)}
                                </p>
                                {entry.validationErrors?.length ? (
                                  <p className='mt-2 text-sm text-amber-700'>
                                    {entry.validationErrors.join(' • ')}
                                  </p>
                                ) : null}
                              </div>

                              {entry.validationStatus === 'PENDENTE_VINCULO' && canReview ? (
                                <div className='flex min-w-[320px] flex-col gap-2'>
                                  <select
                                    value={resolveSelections[entry.id] || ''}
                                    onChange={(event) =>
                                      setResolveSelections((prev) => ({
                                        ...prev,
                                        [entry.id]: event.target.value,
                                      }))
                                    }
                                    className='rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                                  >
                                    <option value=''>Selecionar colaborador</option>
                                    {options.employees.map((employee) => (
                                      <option key={employee.id} value={employee.id}>
                                        {employee.name} • {employee.department}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleResolveEntry(previewBatch.id, entry.id)
                                    }
                                    disabled={resolvingEntryId === entry.id}
                                    className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
                                  >
                                    {resolvingEntryId === entry.id
                                      ? 'Vinculando...'
                                      : 'Resolver vínculo'}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>

                      {previewPendingEntries.length > 0 ? (
                        <div className='mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
                          Existem {previewPendingEntries.length} linha(s) pendente(s) de
                          vínculo manual antes do fechamento operacional do lote.
                        </div>
                      ) : null}
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isBatchDrawerOpen && selectedBatch && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={() => setIsBatchDrawerOpen(false)}
          />

          <div className='relative flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                    Histórico auditável
                  </div>
                  <h2 className='text-2xl font-bold text-slate-800'>
                    {selectedBatch.originalName}
                  </h2>
                  <p className='mt-1 text-sm text-slate-500'>
                    Lote criado em {formatDateTime(selectedBatch.createdAt)} • {selectedBatch.source}
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setIsBatchDrawerOpen(false)}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-6'>
              <div className='space-y-6'>
                <section className='grid grid-cols-1 gap-4 md:grid-cols-5'>
                  <InfoCard title='Linhas' value={selectedBatch.totalRows} subtitle='Total recebido' tone='slate' />
                  <InfoCard title='Válidas' value={selectedBatch.validRows} subtitle='Consolidadas' tone='green' />
                  <InfoCard title='Pendentes' value={selectedBatch.pendingRows} subtitle='Aguardando vínculo' tone='amber' />
                  <InfoCard title='Inválidas' value={selectedBatch.invalidRows} subtitle='Rejeitadas na validação' tone='rose' />
                  <InfoCard title='Duplicadas' value={selectedBatch.duplicateRows} subtitle='Linhas repetidas' tone='violet' />
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
                  <div className='border-b border-slate-200 px-6 py-5'>
                    <h3 className='text-lg font-semibold text-slate-800'>
                      Detalhe das linhas importadas
                    </h3>
                    <p className='mt-1 text-sm text-slate-500'>
                      Conferência completa do lote com resolução de vínculo quando necessária.
                    </p>
                  </div>

                  <div className='space-y-4 px-6 py-6'>
                    {(selectedBatch.entries || []).map((entry) => (
                      <div
                        key={entry.id}
                        className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                      >
                        <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                          <div>
                            <div className='flex flex-wrap items-center gap-2'>
                              <p className='text-base font-bold text-slate-900'>
                                {entry.employeeNameSnapshot || 'Sem nome identificado'}
                              </p>
                              <StatusBadge
                                status={entry.validationStatus}
                                configMap={validationStatusConfig}
                              />
                            </div>
                            <div className='mt-2 flex flex-wrap gap-4 text-sm text-slate-500'>
                              <span>Linha {entry.sourceRowNumber}</span>
                              <span>{formatDate(entry.workDate)}</span>
                              <span>Trabalhadas {formatMinutes(entry.workedMinutes)}</span>
                              <span>Extras {formatMinutes(entry.overtimeMinutes)}</span>
                              <span>Banco {formatMinutes(entry.bankHoursMinutes)}</span>
                            </div>
                            {entry.employee ? (
                              <p className='mt-2 text-sm text-emerald-700'>
                                Vinculado a {entry.employee.name}
                              </p>
                            ) : null}
                            {entry.validationErrors?.length ? (
                              <p className='mt-2 text-sm text-amber-700'>
                                {entry.validationErrors.join(' • ')}
                              </p>
                            ) : null}
                          </div>

                          {entry.validationStatus === 'PENDENTE_VINCULO' && canReview ? (
                            <div className='flex min-w-[320px] flex-col gap-2'>
                              <select
                                value={resolveSelections[entry.id] || ''}
                                onChange={(event) =>
                                  setResolveSelections((prev) => ({
                                    ...prev,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                className='rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                              >
                                <option value=''>Selecionar colaborador</option>
                                {options.employees.map((employee) => (
                                  <option key={employee.id} value={employee.id}>
                                    {employee.name} • {employee.department}
                                  </option>
                                ))}
                              </select>

                              <button
                                type='button'
                                onClick={() =>
                                  handleResolveEntry(selectedBatch.id, entry.id)
                                }
                                disabled={resolvingEntryId === entry.id}
                                className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
                              >
                                {resolvingEntryId === entry.id
                                  ? 'Vinculando...'
                                  : 'Resolver vínculo'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Timesheet;
