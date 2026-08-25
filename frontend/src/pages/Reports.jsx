import React, { useEffect, useMemo, useState } from 'react';
import api, { resolveApiErrorMessage } from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const reportTypeMeta = {
  employees: {
    label: 'Colaboradores',
    heroTone: 'from-slate-950 via-slate-900 to-blue-900',
    helper:
      'Base executiva de pessoas, status, admissoes, distribuicao por empresa e recortes operacionais.',
    show: ['period', 'search', 'employee', 'department', 'status', 'company'],
    statusLabel: 'Status',
  },
  occurrences: {
    label: 'Ocorrencias',
    heroTone: 'from-slate-950 via-slate-900 to-amber-800',
    helper:
      'Atestados, advertencias, suspensoes e afastamentos com leitura por periodo e contexto.',
    show: ['period', 'search', 'employee', 'department', 'status', 'company'],
    statusLabel: 'Status',
  },
  documents: {
    label: 'Documentacao',
    heroTone: 'from-slate-950 via-slate-900 to-emerald-800',
    helper:
      'Acervo documental, uploads, storage corporativo e movimentacao por modulo.',
    show: ['period', 'search', 'employee', 'status', 'company'],
    statusLabel: 'Categoria',
  },
  journey: {
    label: 'Jornada',
    heroTone: 'from-slate-950 via-slate-900 to-violet-800',
    helper:
      'Consolidado de horas, extras, banco operacional e impactos de afastamentos.',
    show: ['period', 'search', 'employee', 'department', 'company', 'monthYear'],
    statusLabel: 'Status',
  },
  payroll: {
    label: 'Folha de Pagamento',
    heroTone: 'from-slate-950 via-slate-900 to-rose-800',
    helper:
      'Competencias, totais financeiros, processamento e fechamento da folha.',
    show: ['period', 'search', 'status', 'company', 'monthYear'],
    statusLabel: 'Status da competencia',
  },
  payslips: {
    label: 'Holerites',
    heroTone: 'from-slate-950 via-slate-900 to-indigo-800',
    helper:
      'Preview e consolidado dos demonstrativos por colaborador e competencia.',
    show: ['period', 'search', 'employee', 'status', 'company', 'monthYear'],
    statusLabel: 'Status',
  },
  charges: {
    label: 'Encargos',
    heroTone: 'from-slate-950 via-slate-900 to-cyan-800',
    helper:
      'Bases consolidadas, total de encargos e leitura fiscal-operacional por competencia.',
    show: ['period', 'search', 'status', 'company', 'monthYear'],
    statusLabel: 'Status da competencia',
  },
  audit: {
    label: 'Auditoria',
    heroTone: 'from-slate-950 via-slate-900 to-orange-800',
    helper:
      'Trilha de acoes por usuario, modulo, severidade e eventos de governanca.',
    show: ['period', 'search', 'user', 'module', 'action', 'company'],
    statusLabel: 'Acao',
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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatValue = (value, format) => {
  if (value === undefined || value === null || value === '') return '-';

  if (format === 'currency') return currencyFormatter.format(Number(value || 0));
  if (format === 'date') return formatDate(value);
  if (format === 'datetime') return formatDateTime(value);
  if (format === 'number') return Number(value || 0).toLocaleString('pt-BR');

  return String(value);
};

const Reports = () => {
  const { hasPermission } = useAuthSession();
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [options, setOptions] = useState({
    reportTypes: [],
    employees: [],
    departments: [],
    companies: [],
    users: [],
  });
  const [filters, setFilters] = useState({
    reportType: 'employees',
    startDate: firstDayOfMonth.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    search: '',
    employeeId: '',
    department: 'TODOS',
    status: 'TODOS',
    companyId: 'TODOS',
    userId: 'TODOS',
    module: 'TODOS',
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
  });
  const [report, setReport] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canReadReports = hasPermission('reports.read');
  const canExportExcel = hasPermission('reports.export_excel');
  const canExportPdf = hasPermission('reports.export_pdf');

  const currentTypeMeta =
    reportTypeMeta[filters.reportType] || reportTypeMeta.employees;

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!loadingOptions && canReadReports) {
      handlePreview();
    }
  }, [loadingOptions]);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      const response = await api.get('/reports/options');
      setOptions(
        response.data?.options || {
          reportTypes: [],
          employees: [],
          departments: [],
          companies: [],
          users: [],
        }
      );
      setErrorMessage('');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao carregar opcoes de relatorios:', error);
      }
      setErrorMessage(resolveApiErrorMessage(error));
    } finally {
      setLoadingOptions(false);
    }
  };

  const buildParams = () => {
    const params = {
      reportType: filters.reportType,
    };

    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.employeeId && filters.employeeId !== 'TODOS') {
      params.employeeId = filters.employeeId;
    }
    if (filters.department && filters.department !== 'TODOS') {
      params.department = filters.department;
    }
    if (filters.status && filters.status !== 'TODOS') {
      params.status = filters.status;
    }
    if (filters.companyId && filters.companyId !== 'TODOS') {
      params.companyId = filters.companyId;
    }
    if (filters.userId && filters.userId !== 'TODOS') {
      params.userId = filters.userId;
    }
    if (filters.module && filters.module !== 'TODOS') {
      params.module = filters.module;
    }
    if (filters.month && filters.month !== 'TODOS') {
      params.month = filters.month;
    }
    if (filters.year && filters.year !== 'TODOS') {
      params.year = filters.year;
    }

    return params;
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReportTypeChange = (event) => {
    const nextType = event.target.value;

    setFilters((prev) => ({
      ...prev,
      reportType: nextType,
      employeeId: '',
      department: 'TODOS',
      status: 'TODOS',
      userId: 'TODOS',
      module: 'TODOS',
    }));
  };

  const handlePreview = async () => {
    try {
      setLoadingPreview(true);
      setErrorMessage('');
      const response = await api.get('/reports/preview', {
        params: buildParams(),
      });
      setReport(response.data?.report || null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao gerar preview do relatorio:', error);
      }
      setErrorMessage(resolveApiErrorMessage(error));
      setReport(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    const stateSetter = format === 'excel' ? setExportingExcel : setExportingPdf;

    try {
      stateSetter(true);
      setErrorMessage('');
      const endpoint =
        format === 'excel' ? '/reports/export/excel' : '/reports/export/pdf';

      const response = await api.get(endpoint, {
        params: buildParams(),
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const fallbackName =
        format === 'excel' ? 'relatorio.xlsx' : 'relatorio.pdf';
      const fileNameMatch =
        contentDisposition.match(/filename="([^"]+)"/i) ||
        contentDisposition.match(/filename=([^;]+)/i);
      const fileName = fileNameMatch?.[1] || fallbackName;

      downloadBlob(response.data, fileName);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`Erro ao exportar relatorio em ${format}:`, error);
      }
      setErrorMessage(resolveApiErrorMessage(error));
    } finally {
      stateSetter(false);
    }
  };

  const reportTypeOptions =
    options.reportTypes?.length > 0 ? options.reportTypes : Object.values(reportTypeMeta);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  const auditModules = useMemo(() => {
    const set = new Set([
      'employees',
      'documents',
      'warnings',
      'suspensions',
      'leave',
      'payroll',
      'payroll_events',
      'payslips',
      'users',
      'roles_permissions',
      'audit',
      'reports',
    ]);

    if (Array.isArray(report?.rows)) {
      report.rows.forEach((item) => {
        if (item.module) set.add(item.module);
      });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [report]);

  if (!canReadReports) {
    return (
      <div className='rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm'>
        Voce nao possui permissao para acessar a central de relatorios.
      </div>
    );
  }

  const visibleFilters = currentTypeMeta.show || [];

  return (
    <div className='space-y-8'>
      <div
        className={`overflow-hidden rounded-[32px] bg-gradient-to-r ${currentTypeMeta.heroTone} p-8 text-white shadow-xl`}
      >
        <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
          <div className='max-w-4xl'>
            <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
              Inteligencia executiva
            </p>
            <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>Relatorios</h1>
            <p className='mt-4 text-lg text-slate-300'>{currentTypeMeta.helper}</p>
          </div>

          <div className='grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-2'>
            <InsightPill
              title='Tipo selecionado'
              value={currentTypeMeta.label}
            />
            <InsightPill
              title='Formato principal'
              value='Preview + Excel + PDF'
            />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
        <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                  Configuracao
                </p>
                <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                  Montagem do relatorio
                </h2>
              </div>

              <div className='flex flex-wrap gap-3'>
                <button
                  type='button'
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loadingPreview ? 'Gerando preview...' : 'Gerar preview'}
                </button>

                {canExportExcel ? (
                  <button
                    type='button'
                    onClick={() => handleExport('excel')}
                    disabled={!report || exportingExcel}
                    className='rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {exportingExcel ? 'Exportando Excel...' : 'Exportar Excel'}
                  </button>
                ) : null}

                {canExportPdf ? (
                  <button
                    type='button'
                    onClick={() => handleExport('pdf')}
                    disabled={!report || exportingPdf}
                    className='rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
                  </button>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800'>
                <p className='font-semibold'>Nao foi possivel concluir a operacao</p>
                <p className='mt-1'>{errorMessage}</p>
                <button
                  type='button'
                  onClick={handlePreview}
                  className='mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <FilterField label='Tipo de relatorio'>
                <select
                  name='reportType'
                  value={filters.reportType}
                  onChange={handleReportTypeChange}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                >
                  {reportTypeOptions.map((item, index) => (
                    <option
                      key={`report-type-${index}-${item.value || item.label}`}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </FilterField>

              {visibleFilters.includes('search') ? (
                <FilterField label='Busca'>
                  <input
                    type='text'
                    name='search'
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder='Buscar por termo relevante'
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  />
                </FilterField>
              ) : null}

              {visibleFilters.includes('period') ? (
                <>
                  <FilterField label='Data inicial'>
                    <input
                      type='date'
                      name='startDate'
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    />
                  </FilterField>

                  <FilterField label='Data final'>
                    <input
                      type='date'
                      name='endDate'
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    />
                  </FilterField>
                </>
              ) : null}

              {visibleFilters.includes('employee') ? (
                <FilterField label='Colaborador'>
                  <select
                    name='employeeId'
                    value={filters.employeeId}
                    onChange={handleFilterChange}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value=''>Todos</option>
                    {options.employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}

              {visibleFilters.includes('department') ? (
                <FilterField label='Departamento'>
                  <select
                    name='department'
                    value={filters.department}
                    onChange={handleFilterChange}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Todos</option>
                    {options.departments.map((item, index) => (
                      <option key={`department-${index}-${item}`} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}

              {visibleFilters.includes('status') ? (
                <FilterField label={currentTypeMeta.statusLabel}>
                  <input
                    type='text'
                    name='status'
                    value={filters.status === 'TODOS' ? '' : filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: event.target.value.trim() || 'TODOS',
                      }))
                    }
                    placeholder='Ex: FECHADA, Registrada, PENDENTE'
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  />
                </FilterField>
              ) : null}

              {visibleFilters.includes('company') ? (
                <FilterField label='Empresa'>
                  <select
                    name='companyId'
                    value={filters.companyId}
                    onChange={handleFilterChange}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Contexto atual</option>
                    {options.companies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}

              {visibleFilters.includes('user') ? (
                <FilterField label='Usuario responsavel'>
                  <select
                    name='userId'
                    value={filters.userId}
                    onChange={handleFilterChange}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Todos</option>
                    {options.users.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.email}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}

              {visibleFilters.includes('module') ? (
                <FilterField label='Modulo/origem'>
                  <select
                    name='module'
                    value={filters.module}
                    onChange={handleFilterChange}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    <option value='TODOS'>Todos</option>
                    {auditModules.map((item, index) => (
                      <option key={`audit-module-${index}-${item}`} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}

              {visibleFilters.includes('monthYear') ? (
                <>
                  <FilterField label='Mes'>
                    <select
                      name='month'
                      value={filters.month}
                      onChange={handleFilterChange}
                      className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    >
                      {Array.from({ length: 12 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>
                          {String(index + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </FilterField>

                  <FilterField label='Ano'>
                    <select
                      name='year'
                      value={filters.year}
                      onChange={handleFilterChange}
                      className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    >
                      {years.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                Leitura executiva
              </p>
              <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                Contexto do relatorio
              </h2>
              <p className='mt-2 text-sm text-slate-500'>
                Aplique o foco desejado, gere a previa e exporte exatamente o
                que foi conferido em tela.
              </p>
            </div>

            <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'>
              {report?.rows?.length || 0} linha(s)
            </span>
          </div>

          <div className='mt-5 space-y-3'>
            <InsightLine
              label='Periodo'
              value={report?.periodLabel || 'Aguardando preview'}
            />
            <InsightLine
              label='Tipo'
              value={currentTypeMeta.label}
            />
            <InsightLine
              label='Exportacoes'
              value='Excel obrigatorio e PDF executivo'
            />
          </div>

          <div className='mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
              Destaques rapidos
            </p>
            <div className='mt-3 space-y-2'>
              {report?.highlights?.length ? (
                report.highlights.map((item, index) => (
                  <div
                    key={`highlight-${index}-${String(item)}`}
                    className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700'
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500'>
                  Gere a previa para que o sistema monte os principais destaques
                  executivos desse relatorio.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {report?.summaryCards?.length ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {report.summaryCards.map((card, index) => (
            <InfoCard
              key={`summary-card-${index}-${card.title}`}
              title={card.title}
              value={formatValue(card.value, typeof card.value === 'number' && card.title.toLowerCase().includes('base') ? 'currency' : undefined)}
              subtitle={card.subtitle}
              tone={card.tone || 'slate'}
            />
          ))}
        </div>
      ) : null}

      <section className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                Preview antes da exportacao
              </p>
              <h3 className='mt-2 text-2xl font-bold text-slate-900'>
                {report?.tableTitle || 'Previa do relatorio'}
              </h3>
              <p className='mt-2 text-sm text-slate-500'>
                Revise os dados em tela antes de gerar Excel ou PDF.
              </p>
            </div>

            {report?.appliedFilters?.length ? (
              <div className='flex flex-wrap gap-2'>
                {report.appliedFilters.map((item, index) => (
                  <span
                    key={`applied-filter-${index}-${item.label}-${item.value}`}
                    className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {loadingPreview ? (
          <div className='px-6 py-8'>
            <div className='mb-6 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4'>
              <div className='h-4 w-48 rounded-full bg-slate-200' />
              <div className='mt-3 h-3 w-72 rounded-full bg-slate-200' />
            </div>
            <div className='space-y-3'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`report-skeleton-${index}`}
                  className='grid animate-pulse grid-cols-4 gap-3 rounded-2xl border border-slate-100 px-4 py-4'
                >
                  {Array.from({ length: 4 }).map((__, columnIndex) => (
                    <div
                      key={`report-skeleton-${index}-${columnIndex}`}
                      className='h-4 rounded-full bg-slate-100'
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : !report ? (
          <div className='px-6 py-14 text-center text-slate-500'>
            Nenhuma previa gerada ainda.
          </div>
        ) : report.rows.length === 0 ? (
          <div className='px-6 py-14 text-center text-slate-500'>
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead className='bg-slate-50'>
                <tr className='text-left'>
                  {report.columns.map((column, index) => (
                    <th
                      key={`report-column-${index}-${column.key}`}
                      className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {report.rows.map((row, index) => (
                  <tr key={`${row.id || row.collaborator || 'row'}-${index}`} className='hover:bg-slate-50/70'>
                    {report.columns.map((column, columnIndex) => (
                      <td
                        key={`report-cell-${columnIndex}-${column.key}`}
                        className='px-6 py-5 align-top text-sm text-slate-700'
                      >
                        <span className='whitespace-pre-wrap break-words'>
                          {formatValue(row[column.key], column.format)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const FilterField = ({ label, children }) => (
  <div>
    <label className='mb-2 block text-sm font-semibold text-slate-700'>
      {label}
    </label>
    {children}
  </div>
);

const InsightPill = ({ title, value }) => (
  <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3'>
    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
      {title}
    </p>
    <p className='mt-2 text-base font-bold text-white'>{value}</p>
  </div>
);

const InsightLine = ({ label, value }) => (
  <div className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
    <span className='text-sm font-medium text-slate-500'>{label}</span>
    <span className='text-sm font-semibold text-slate-800'>{value}</span>
  </div>
);

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

export default Reports;
