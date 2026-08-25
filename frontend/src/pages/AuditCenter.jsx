import React, { useEffect, useMemo, useState } from 'react';
import api, { resolveApiErrorMessage } from '../services/api';

const severityOptions = [
  { value: 'TODOS', label: 'Todas as severidades' },
  { value: 'INFO', label: 'Informativo' },
  { value: 'WARNING', label: 'Atencao' },
  { value: 'CRITICAL', label: 'Critico' },
];

const actionOptions = [
  { value: 'TODOS', label: 'Todas as acoes' },
  { value: 'CREATE', label: 'Criacao' },
  { value: 'UPDATE', label: 'Atualizacao' },
  { value: 'DELETE', label: 'Exclusao' },
  { value: 'SOFT_DELETE', label: 'Exclusao logica' },
  { value: 'UPLOAD', label: 'Upload' },
  { value: 'REPLACE_FILE', label: 'Substituicao de arquivo' },
  { value: 'VIEW', label: 'Visualizacao' },
  { value: 'EXPORT', label: 'Exportacao' },
  { value: 'PROCESS', label: 'Processamento' },
  { value: 'CLOSE', label: 'Fechamento' },
  { value: 'REOPEN', label: 'Reabertura' },
  { value: 'RESET_PASSWORD', label: 'Reset de senha' },
  { value: 'ASSIGN_ROLE', label: 'Atribuicao de perfil' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'ACCESS_DENIED', label: 'Acesso negado' },
];

const severityToneClasses = {
  INFO: 'border border-blue-200 bg-blue-50 text-blue-700',
  WARNING: 'border border-amber-200 bg-amber-50 text-amber-700',
  CRITICAL: 'border border-red-200 bg-red-50 text-red-700',
};

const syncToneClasses = {
  LOCAL_ONLY: 'border border-slate-200 bg-slate-100 text-slate-700',
  PENDING: 'border border-amber-200 bg-amber-50 text-amber-700',
  SYNCED: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border border-red-200 bg-red-50 text-red-700',
  ARCHIVED: 'border border-violet-200 bg-violet-50 text-violet-700',
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const formatJson = (value) => {
  if (!value) return '-';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '-';
  }
};

const normalizeStorageProvider = (provider) => {
  const normalized = String(provider || 'LOCAL').toUpperCase();

  if (normalized === 'SHAREPOINT') return 'SharePoint';
  if (normalized === 'ONEDRIVE') return 'OneDrive';
  return 'Local';
};

const AuditCenter = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    criticalCount: 0,
    todayCount: 0,
    topModule: null,
    mostActiveUser: null,
  });
  const [storageSettings, setStorageSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedLog, setSelectedLog] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('TODOS');
  const [actionFilter, setActionFilter] = useState('TODOS');
  const [severityFilter, setSeverityFilter] = useState('TODOS');
  const [entityFilter, setEntityFilter] = useState('TODOS');
  const [userFilter, setUserFilter] = useState('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    fetchStorageSettings();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, moduleFilter, actionFilter, severityFilter, entityFilter, userFilter, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [
    search,
    moduleFilter,
    actionFilter,
    severityFilter,
    entityFilter,
    userFilter,
    startDate,
    endDate,
    page,
  ]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (moduleFilter !== 'TODOS') params.module = moduleFilter;
      if (actionFilter !== 'TODOS') params.action = actionFilter;
      if (severityFilter !== 'TODOS') params.severity = severityFilter;
      if (entityFilter !== 'TODOS') params.entityType = entityFilter;
      if (userFilter !== 'TODOS') params.userId = userFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      params.page = page;
      params.limit = 50;

      const response = await api.get('/audit', { params });

      setLogs(response.data?.logs || []);
      setPagination(
        response.data?.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
        }
      );
      setSummary(
        response.data?.summary || {
          total: 0,
          criticalCount: 0,
          todayCount: 0,
          topModule: null,
          mostActiveUser: null,
        }
      );
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(resolveApiErrorMessage(error));
      setLogs([]);
      setSummary({
        total: 0,
        criticalCount: 0,
        todayCount: 0,
        topModule: null,
        mostActiveUser: null,
      });
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageSettings = async () => {
    try {
      const response = await api.get('/storage/settings');
      setStorageSettings(response.data?.settings || null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao carregar configuracao de storage:', error);
      }
      setStorageSettings(null);
    }
  };

  const modules = useMemo(() => {
    return Array.from(
      new Set(logs.map((item) => item.module).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const entityTypes = useMemo(() => {
    return Array.from(
      new Set(logs.map((item) => item.entityType).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const users = useMemo(() => {
    const registry = new Map();

    logs.forEach((item) => {
      if (!item.userId || registry.has(item.userId)) return;

      registry.set(item.userId, {
        id: item.userId,
        name:
          item.userNameSnapshot ||
          item.userEmailSnapshot ||
          `Usuario ${item.userId}`,
      });
    });

    return Array.from(registry.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [logs]);

  const highlightInsights = useMemo(() => {
    const insights = [];

    if (summary.topModule?.module) {
      insights.push(
        `Modulo mais movimentado: ${summary.topModule.module} (${summary.topModule.count} evento(s))`
      );
    }

    if (summary.mostActiveUser?.name) {
      insights.push(
        `Usuario mais ativo: ${summary.mostActiveUser.name} (${summary.mostActiveUser.count} registro(s))`
      );
    }

    if (storageSettings?.provider) {
      insights.push(
        `Storage corporativo atual: ${normalizeStorageProvider(storageSettings.provider)}`
      );
    }

    if (summary.criticalCount > 0) {
      insights.push(
        `${summary.criticalCount} evento(s) critico(s) exigem revisao administrativa`
      );
    }

    return insights;
  }, [storageSettings, summary]);

  const renderList = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando trilha de auditoria...
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum evento de auditoria encontrado para os filtros selecionados.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Linha do tempo de auditoria
          </h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Data/Hora
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Usuario
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Modulo
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Acao
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Entidade
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Resumo
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Severidade
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {logs.map((item) => (
                <tr key={item.id} className='hover:bg-slate-50/70'>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>
                        {item.userNameSnapshot || 'Sistema'}
                      </p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {item.userEmailSnapshot || '-'}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm font-semibold text-slate-800'>
                    {item.module}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {item.action}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {item.entityType}
                    {item.entityId ? ` #${item.entityId}` : ''}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {item.summary}
                  </td>
                  <td className='px-6 py-5'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        severityToneClasses[item.severity] ||
                        severityToneClasses.INFO
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex justify-center'>
                      <MiniActionButton
                        label='Detalhes'
                        onClick={() => setSelectedLog(item)}
                      />
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

  const renderCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando visao executiva da auditoria...
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Ainda nao ha eventos suficientes para compor a visao premium da auditoria.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {logs.slice(0, 12).map((item) => (
          <div
            key={item.id}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                    {item.module}
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>{item.action}</h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    severityToneClasses[item.severity] ||
                    severityToneClasses.INFO
                  }`}
                >
                  {item.severity}
                </span>
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox
                  label='Usuario'
                  value={item.userNameSnapshot || 'Sistema'}
                />
                <InfoBox
                  label='Entidade'
                  value={`${item.entityType}${item.entityId ? ` #${item.entityId}` : ''}`}
                />
                <InfoBox
                  label='Request ID'
                  value={item.requestId || '-'}
                />
                <InfoBox label='IP' value={item.ipAddress || '-'} />
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm text-slate-500'>Resumo executivo</p>
                <p className='mt-1 text-sm font-semibold text-slate-800'>
                  {item.summary}
                </p>
              </div>

              <div className='flex flex-wrap gap-3 pt-1'>
                <ActionButton
                  label='Abrir detalhes'
                  onClick={() => setSelectedLog(item)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-4xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
                Governanca enterprise
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Central de Auditoria
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Rastreie alteracoes, acessos, uploads e eventos criticos do
                EloSystem com visao operacional e governanca documental pronta
                para SharePoint e OneDrive corporativo.
              </p>
            </div>

            <div className='grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-2'>
              <InsightPill
                title='Storage corporativo'
                value={
                  storageSettings
                    ? normalizeStorageProvider(storageSettings.provider)
                    : 'Nao configurado'
                }
              />
              <InsightPill
                title='Status da sincronizacao'
                value={
                  storageSettings?.isActive
                    ? 'Integracao ativa'
                    : 'Modo local/fallback'
                }
              />
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <InfoCard
            title='Total de eventos'
            value={summary.total}
            subtitle='Rastreamento consolidado'
            tone='slate'
          />
          <InfoCard
            title='Eventos criticos'
            value={summary.criticalCount}
            subtitle='Ocorrencias com maior severidade'
            tone='red'
          />
          <InfoCard
            title='Acoes hoje'
            value={summary.todayCount}
            subtitle='Movimentacoes registradas no dia'
            tone='blue'
          />
          <InfoCard
            title='Usuario mais ativo'
            value={summary.mostActiveUser?.count || 0}
            subtitle={summary.mostActiveUser?.name || 'Sem movimentacao'}
            tone='violet'
          />
          <InfoCard
            title='Modulo dominante'
            value={summary.topModule?.count || 0}
            subtitle={summary.topModule?.module || 'Sem concentracao'}
            tone='orange'
          />
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                  Inteligencia operacional
                </p>
                <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                  Leituras prioritarias
                </h2>
                <p className='mt-2 text-sm text-slate-500'>
                  Destaques gerados com base na trilha de auditoria e no estado
                  atual da governanca documental.
                </p>
              </div>

              <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'>
                {highlightInsights.length} insight(s)
              </span>
            </div>

            <div className='mt-5 grid grid-cols-1 gap-3 md:grid-cols-2'>
              {highlightInsights.length > 0 ? (
                highlightInsights.map((item) => (
                  <div
                    key={item}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700'
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2'>
                  Assim que o EloSystem acumular mais movimentacoes, essa area
                  exibira leituras automaticas de tendencia, criticidade e
                  governanca.
                </div>
              )}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                  Storage corporativo
                </p>
                <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                  Governanca documental
                </h2>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  syncToneClasses[
                    storageSettings?.isActive ? 'SYNCED' : 'LOCAL_ONLY'
                  ]
                }`}
              >
                {storageSettings?.isActive ? 'Ativo' : 'Fallback local'}
              </span>
            </div>

            <div className='mt-5 space-y-3'>
              <StorageLine
                label='Provider'
                value={
                  storageSettings
                    ? normalizeStorageProvider(storageSettings.provider)
                    : 'Nao configurado'
                }
              />
              <StorageLine
                label='Pasta raiz'
                value={storageSettings?.rootFolder || 'EloSystem'}
              />
              <StorageLine
                label='Sincronizacao documental'
                value={
                  storageSettings?.syncDocuments
                    ? 'Documentos habilitados'
                    : 'Aguardando ativacao'
                }
              />
              <StorageLine
                label='Fallback local'
                value={
                  storageSettings?.allowLocalFallback
                    ? 'Permitido'
                    : 'Desativado'
                }
              />
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
            <div className='lg:col-span-2'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                placeholder='Buscar por resumo, usuario, modulo ou entidade'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Modulo
              </label>
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Acao
              </label>
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Severidade
              </label>
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Entidade
              </label>
              <select
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todas</option>
                {entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Usuario
              </label>
              <select
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Data inicial
              </label>
              <input
                type='date'
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Data final
              </label>
              <input
                type='date'
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm'>
            <p className='font-semibold'>Falha ao carregar auditoria</p>
            <p className='mt-1'>{errorMessage}</p>
            <button
              type='button'
              onClick={fetchAuditLogs}
              className='mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

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
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Visao premium
            </button>
          </div>
        </div>

        {activeTab === 'list' ? renderList() : renderCards()}

        {!loading && logs.length > 0 ? (
          <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm'>
            <p className='text-sm text-slate-500'>
              Pagina {pagination.page} de {pagination.totalPages} • {pagination.total}{' '}
              evento(s)
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={pagination.page <= 1}
                className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Anterior
              </button>
              <button
                type='button'
                onClick={() =>
                  setPage((prev) =>
                    Math.min(prev + 1, pagination.totalPages || prev + 1)
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className='rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Proxima
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedLog && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={() => setSelectedLog(null)}
          />

          <div className='relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={() => setSelectedLog(null)}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      Evento auditavel
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {selectedLog.action}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      {selectedLog.module} • {formatDateTime(selectedLog.createdAt)}
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={() => setSelectedLog(null)}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-6'>
              <div className='space-y-6'>
                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                    <InfoBox
                      label='Usuario'
                      value={selectedLog.userNameSnapshot || 'Sistema'}
                    />
                    <InfoBox
                      label='E-mail'
                      value={selectedLog.userEmailSnapshot || '-'}
                    />
                    <InfoBox label='Modulo' value={selectedLog.module} />
                    <InfoBox label='Severidade' value={selectedLog.severity} />
                    <InfoBox
                      label='Entidade'
                      value={`${selectedLog.entityType}${selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}`}
                    />
                    <InfoBox
                      label='Request ID'
                      value={selectedLog.requestId || '-'}
                    />
                    <InfoBox
                      label='IP'
                      value={selectedLog.ipAddress || '-'}
                    />
                    <InfoBox
                      label='User Agent'
                      value={selectedLog.userAgent || '-'}
                    />
                  </div>
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <h3 className='text-lg font-semibold text-slate-800'>
                    Resumo executivo
                  </h3>
                  <p className='mt-3 text-sm font-medium text-slate-700'>
                    {selectedLog.summary}
                  </p>
                </section>

                <DetailJsonCard
                  title='Detalhes complementares'
                  value={formatJson(selectedLog.detailsJson)}
                />
                <DetailJsonCard
                  title='Estado anterior'
                  value={formatJson(selectedLog.beforeJson)}
                />
                <DetailJsonCard
                  title='Estado posterior'
                  value={formatJson(selectedLog.afterJson)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
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
    <p className='mt-1 break-words text-sm font-semibold text-slate-800'>
      {value}
    </p>
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

const StorageLine = ({ label, value }) => (
  <div className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
    <span className='text-sm font-medium text-slate-500'>{label}</span>
    <span className='text-sm font-semibold text-slate-800'>{value}</span>
  </div>
);

const ActionButton = ({ label, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
  >
    {label}
  </button>
);

const MiniActionButton = ({ label, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100'
  >
    {label}
  </button>
);

const DetailJsonCard = ({ title, value }) => (
  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
    <h3 className='text-lg font-semibold text-slate-800'>{title}</h3>
    <pre className='mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100'>
      {value}
    </pre>
  </section>
);

export default AuditCenter;
