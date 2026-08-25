import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const statusToneClasses = {
  CONECTADA: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  CONFIGURACAO_PENDENTE: 'border border-amber-200 bg-amber-50 text-amber-700',
  INATIVA: 'border border-slate-200 bg-slate-100 text-slate-700',
  ERRO: 'border border-rose-200 bg-rose-50 text-rose-700',
  EM_IMPLANTACAO: 'border border-violet-200 bg-violet-50 text-violet-700',
};

const logToneClasses = {
  SUCCESS: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  WARNING: 'border border-amber-200 bg-amber-50 text-amber-700',
  ERROR: 'border border-rose-200 bg-rose-50 text-rose-700',
  PENDING: 'border border-slate-200 bg-slate-100 text-slate-700',
};

const providerIcons = {
  SHAREPOINT: '🗂️',
  ONEDRIVE: '☁️',
  MYAHGORA_TOTVS: '🕘',
  EMAIL: '✉️',
  API_WEBHOOKS: '🔌',
  FUTURE: '✨',
};

const providerFieldDefinitions = {
  SHAREPOINT: [
    { key: 'tenantId', label: 'Tenant ID', type: 'text' },
    { key: 'clientId', label: 'Client ID', type: 'text' },
    { key: 'siteId', label: 'Site ID', type: 'text' },
    { key: 'driveId', label: 'Drive ID / Biblioteca', type: 'text' },
    { key: 'rootFolder', label: 'Pasta raiz', type: 'text' },
    { key: 'libraryName', label: 'Biblioteca alvo', type: 'text' },
    { key: 'useAsPrimaryStorage', label: 'Usar como storage principal', type: 'checkbox' },
    { key: 'syncDocuments', label: 'Sincronizar documentos', type: 'checkbox' },
    { key: 'syncAdmissions', label: 'Sincronizar pre-admissao', type: 'checkbox' },
    { key: 'syncWarnings', label: 'Sincronizar advertencias', type: 'checkbox' },
    { key: 'syncSuspensions', label: 'Sincronizar suspensoes', type: 'checkbox' },
    { key: 'syncLeaves', label: 'Sincronizar afastamentos', type: 'checkbox' },
    { key: 'syncPayslips', label: 'Sincronizar holerites', type: 'checkbox' },
  ],
  ONEDRIVE: [
    { key: 'tenantId', label: 'Tenant ID', type: 'text' },
    { key: 'clientId', label: 'Client ID', type: 'text' },
    { key: 'driveId', label: 'Drive ID corporativo', type: 'text' },
    { key: 'rootFolder', label: 'Pasta raiz', type: 'text' },
    { key: 'appFolder', label: 'Pasta da aplicacao', type: 'text' },
    { key: 'useAsPrimaryStorage', label: 'Usar como storage principal', type: 'checkbox' },
    { key: 'syncDocuments', label: 'Sincronizar documentos', type: 'checkbox' },
    { key: 'syncAdmissions', label: 'Sincronizar pre-admissao', type: 'checkbox' },
    { key: 'syncWarnings', label: 'Sincronizar advertencias', type: 'checkbox' },
    { key: 'syncSuspensions', label: 'Sincronizar suspensoes', type: 'checkbox' },
    { key: 'syncLeaves', label: 'Sincronizar afastamentos', type: 'checkbox' },
    { key: 'syncPayslips', label: 'Sincronizar holerites', type: 'checkbox' },
  ],
  MYAHGORA_TOTVS: [
    { key: 'mode', label: 'Modo de operacao', type: 'text' },
    { key: 'activeProvider', label: 'Provider prioritario', type: 'text' },
    { key: 'expectedFormats', label: 'Formatos esperados', type: 'tags' },
    { key: 'defaultLayout', label: 'Layout padrao', type: 'text' },
    { key: 'importFolder', label: 'Pasta/logica de importacao', type: 'text' },
    { key: 'automationEnabled', label: 'Preparar automacao futura', type: 'checkbox' },
  ],
  EMAIL: [
    { key: 'providerName', label: 'Provider de envio', type: 'text' },
    { key: 'senderName', label: 'Nome do remetente', type: 'text' },
    { key: 'senderEmail', label: 'E-mail remetente', type: 'email' },
    { key: 'replyTo', label: 'Responder para', type: 'email' },
    { key: 'notificationsEnabled', label: 'Notificacoes ativas', type: 'checkbox' },
    { key: 'alertsEnabled', label: 'Alertas operacionais', type: 'checkbox' },
  ],
  API_WEBHOOKS: [
    { key: 'baseUrl', label: 'Base URL', type: 'text' },
    { key: 'webhookEndpoint', label: 'Webhook endpoint', type: 'text' },
    { key: 'keyLabel', label: 'Identificador da chave', type: 'text' },
    { key: 'supportedEvents', label: 'Eventos suportados', type: 'tags' },
    { key: 'outboundEnabled', label: 'Saida de webhooks ativa', type: 'checkbox' },
  ],
  FUTURE: [
    { key: 'roadmapItems', label: 'Roadmap', type: 'tags' },
    { key: 'sandboxReady', label: 'Ambiente preparado', type: 'checkbox' },
  ],
};

const formatDateTime = (value) => {
  if (!value) return 'Sem registro';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sem registro';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const normalizeFormFromIntegration = (integration) => {
  const config = integration?.configJson || {};

  return {
    name: integration?.name || '',
    description: integration?.description || '',
    isActive: Boolean(integration?.isActive),
    notes: integration?.notes || '',
    config: { ...config },
  };
};

const IntegrationMetricCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

const Integrations = () => {
  const { hasPermission } = useAuthSession();
  const [overview, setOverview] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('SHAREPOINT');
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [formState, setFormState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const canReadIntegrations = hasPermission('integrations.read');
  const canManageIntegrations =
    hasPermission('integrations.manage') && hasPermission('integrations.update');
  const canSyncIntegrations =
    hasPermission('integrations.manage') && hasPermission('integrations.sync');
  const canReadLogs =
    hasPermission('integrations.read') && hasPermission('integrations.logs.read');

  const fetchOverview = async (providerToKeep) => {
    try {
      setLoading(true);
      const response = await api.get('/integrations');
      const nextOverview = {
        summary: response.data?.summary || null,
        storageOverview: response.data?.storageOverview || null,
        integrations: response.data?.integrations || [],
        recentLogs: response.data?.recentLogs || [],
      };

      setOverview(nextOverview);
      setLogs(nextOverview.recentLogs || []);

      const nextProvider =
        providerToKeep ||
        selectedProvider ||
        nextOverview.integrations?.[0]?.provider ||
        'SHAREPOINT';

      setSelectedProvider(nextProvider);
      await fetchIntegrationDetail(nextProvider);
    } catch (error) {
      console.error('Erro ao carregar integracoes:', error);
      toast.error('Erro ao carregar hub de integracoes');
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrationDetail = async (provider) => {
    if (!provider) return;

    try {
      setDetailLoading(true);
      const response = await api.get(`/integrations/${provider}`);
      const integration = response.data?.integration || null;
      setSelectedIntegration(integration);
      setFormState(normalizeFormFromIntegration(integration));
    } catch (error) {
      console.error('Erro ao carregar detalhe da integracao:', error);
      toast.error('Nao foi possivel carregar os detalhes da integracao');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchLogs = async (provider = '') => {
    if (!canReadLogs) return;

    try {
      const response = await api.get('/integrations/logs', {
        params: provider ? { provider } : {},
      });
      setLogs(response.data?.logs || []);
    } catch (error) {
      console.error('Erro ao carregar logs de integracao:', error);
    }
  };

  useEffect(() => {
    if (!canReadIntegrations) return;
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadIntegrations]);

  useEffect(() => {
    if (!selectedProvider || !canReadLogs) return;
    fetchLogs(selectedProvider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, canReadLogs]);

  const handleTopLevelChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...(prev || {}),
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleConfigChange = (field, value) => {
    setFormState((prev) => ({
      ...(prev || {}),
      config: {
        ...(prev?.config || {}),
        [field]: value,
      },
    }));
  };

  const selectedFieldDefinitions =
    providerFieldDefinitions[selectedProvider] || [];

  const providerCards = useMemo(
    () => (overview?.integrations || []).map((integration) => ({
      ...integration,
      icon: providerIcons[integration.provider] || '🔌',
    })),
    [overview]
  );

  const executiveCards = useMemo(
    () => [
      {
        title: 'Integracoes catalogadas',
        value: overview?.summary?.total || 0,
        subtitle: 'Conectores administrados no hub enterprise',
        tone: 'blue',
      },
      {
        title: 'Conectadas',
        value: overview?.summary?.connected || 0,
        subtitle: 'Providers com configuracao operacional valida',
        tone: 'green',
      },
      {
        title: 'Com atencao',
        value: overview?.summary?.issues || 0,
        subtitle: 'Integracoes pedindo ajuste ou conferência',
        tone: 'amber',
      },
      {
        title: 'Ultima atividade',
        value: overview?.summary?.lastSync
          ? formatDateTime(overview.summary.lastSync)
          : 'Sem sync',
        subtitle: 'Ultimo evento registrado no historico de integracoes',
        tone: 'violet',
      },
    ],
    [overview]
  );

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selectedProvider || !canManageIntegrations || !formState) return;

    try {
      setSaving(true);
      const payload = {
        name: formState.name,
        description: formState.description,
        isActive: formState.isActive,
        notes: formState.notes,
        ...formState.config,
      };

      const response = await api.put(`/integrations/${selectedProvider}`, payload);
      const integration = response.data?.integration || null;
      setSelectedIntegration(integration);
      setFormState(normalizeFormFromIntegration(integration));
      toast.success('Integracao atualizada com sucesso');
      await fetchOverview(selectedProvider);
    } catch (error) {
      console.error('Erro ao salvar integracao:', error);
      toast.error('Erro ao salvar configuracao da integracao');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider || !canManageIntegrations) return;

    try {
      setTesting(true);
      const response = await api.post(`/integrations/${selectedProvider}/test`);
      const integration = response.data?.integration || null;
      const result = response.data?.result;
      setSelectedIntegration(integration);
      setFormState(normalizeFormFromIntegration(integration));
      toast.success(result?.summary || 'Teste executado com sucesso');
      await fetchOverview(selectedProvider);
    } catch (error) {
      console.error('Erro ao testar integracao:', error);
      toast.error('Nao foi possivel testar a integracao');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!selectedProvider || !canSyncIntegrations) return;

    try {
      setSyncing(true);
      const response = await api.post(`/integrations/${selectedProvider}/sync`);
      const integration = response.data?.integration || null;
      const result = response.data?.result;
      setSelectedIntegration(integration);
      setFormState(normalizeFormFromIntegration(integration));
      toast.success(result?.summary || 'Sincronizacao registrada com sucesso');
      await fetchOverview(selectedProvider);
    } catch (error) {
      console.error('Erro ao sincronizar integracao:', error);
      toast.error('Nao foi possivel registrar a sincronizacao');
    } finally {
      setSyncing(false);
    }
  };

  if (!canReadIntegrations) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm'>
        <h2 className='text-xl font-bold'>Acesso restrito</h2>
        <p className='mt-2 text-sm'>
          Seu perfil ainda nao possui permissao para visualizar o hub de
          integracoes do EloSystem.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <section className='overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm'>
        <div className='bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-8 py-10 text-white'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <div className='max-w-3xl'>
              <div className='mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100'>
                Hub de conectividade enterprise
              </div>
              <h2 className='text-4xl font-bold tracking-tight'>Integrações</h2>
              <p className='mt-4 max-w-2xl text-base text-slate-200'>
                Centralize storage corporativo, importacoes externas, conectores
                de produtividade e trilha operacional das conexoes do EloSystem.
              </p>
            </div>

            <div className='rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm'>
              <p className='text-xs uppercase tracking-[0.24em] text-cyan-100'>
                Storage corporativo
              </p>
              <div className='mt-3 flex items-center gap-3'>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    statusToneClasses[
                      overview?.storageOverview?.isActive ? 'CONECTADA' : 'INATIVA'
                    ]
                  }`}
                >
                  {overview?.storageOverview?.provider || 'LOCAL'}
                </span>
              </div>
              <p className='mt-3 max-w-xs text-sm text-slate-200'>
                Pasta raiz:{' '}
                <span className='font-semibold'>
                  {overview?.storageOverview?.rootFolder || 'EloSystem'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {executiveCards.map((card) => (
          <IntegrationMetricCard key={card.title} {...card} />
        ))}
      </section>

      <section className='grid gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-5'>
            <h3 className='text-2xl font-bold text-slate-900'>
              Providers do ecossistema
            </h3>
            <p className='mt-2 text-sm text-slate-500'>
              Escolha uma integração para revisar status, configuração e
              rastreabilidade operacional.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {providerCards.map((integration) => {
              const isSelected = integration.provider === selectedProvider;

              return (
                <button
                  key={integration.provider}
                  type='button'
                  onClick={() => {
                    setSelectedProvider(integration.provider);
                    fetchIntegrationDetail(integration.provider);
                  }}
                  className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-2xl'>{integration.icon}</div>
                      <h4 className='mt-3 text-xl font-bold'>{integration.name}</h4>
                      <p
                        className={`mt-2 text-sm ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {integration.description}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusToneClasses[integration.status] ||
                        statusToneClasses.CONFIGURACAO_PENDENTE
                      }`}
                    >
                      {integration.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <div className='mt-4 grid gap-3 md:grid-cols-2'>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
                      <p className='text-xs uppercase tracking-[0.18em] opacity-60'>
                        Ultima sync
                      </p>
                      <p className='mt-2 text-sm font-semibold'>
                        {formatDateTime(integration.lastSyncAt)}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-3'>
                      <p className='text-xs uppercase tracking-[0.18em] opacity-60'>
                        Operacoes
                      </p>
                      <p className='mt-2 text-sm font-semibold'>
                        {integration.totalOperations || 0} total
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-5'>
            <h3 className='text-2xl font-bold text-slate-900'>
              Storage corporativo unificado
            </h3>
            <p className='mt-2 text-sm text-slate-500'>
              Visão consolidada dos documentos governados pelo EloSystem, com
              fallback local e postura enterprise para sincronização.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <IntegrationMetricCard
              title='Objetos gerenciados'
              value={overview?.storageOverview?.totalObjects || 0}
              subtitle='Arquivos vinculados a metadados do sistema'
              tone='blue'
            />
            <IntegrationMetricCard
              title='Sincronizados / pendentes'
              value={overview?.storageOverview?.syncedObjects || 0}
              subtitle='Itens prontos para governança corporativa'
              tone='green'
            />
            <IntegrationMetricCard
              title='Falhas recentes'
              value={overview?.storageOverview?.failedObjects || 0}
              subtitle='Objetos com atenção na trilha de storage'
              tone='amber'
            />
            <IntegrationMetricCard
              title='Movimento dos ultimos 7 dias'
              value={overview?.storageOverview?.recentObjects || 0}
              subtitle='Documentos recentes na camada gerenciada'
              tone='violet'
            />
          </div>

          <div className='mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5'>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-slate-400'>
              Operacao ativa
            </p>
            <div className='mt-3 flex flex-wrap items-center gap-3'>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  statusToneClasses[
                    overview?.storageOverview?.isActive ? 'CONECTADA' : 'INATIVA'
                  ]
                }`}
              >
                {overview?.storageOverview?.isActive
                  ? 'Storage corporativo ativo'
                  : 'Fallback local ativo'}
              </span>
              <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                Provider: {overview?.storageOverview?.provider || 'LOCAL'}
              </span>
              <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                Pasta raiz: {overview?.storageOverview?.rootFolder || 'EloSystem'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h3 className='text-2xl font-bold text-slate-900'>
                Painel da integração
              </h3>
              <p className='mt-2 text-sm text-slate-500'>
                Configure o provider selecionado, valide prontidão e registre
                ações administrativas com segurança.
              </p>
            </div>

            {selectedIntegration ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  statusToneClasses[selectedIntegration.status] ||
                  statusToneClasses.CONFIGURACAO_PENDENTE
                }`}
              >
                {selectedIntegration.status.replaceAll('_', ' ')}
              </span>
            ) : null}
          </div>

          {detailLoading || !formState ? (
            <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500'>
              Carregando configuracao da integracao...
            </div>
          ) : (
            <form onSubmit={handleSave} className='space-y-5'>
              <div className='grid gap-5 md:grid-cols-2'>
                <label className='block text-sm font-semibold text-slate-700'>
                  Nome da integracao
                  <input
                    type='text'
                    name='name'
                    value={formState.name}
                    onChange={handleTopLevelChange}
                    disabled={!canManageIntegrations}
                    className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                  />
                </label>

                <label className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                  <div>
                    <p className='text-sm font-semibold text-slate-800'>
                      Integracao ativa
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      Desative apenas se quiser manter o conector em modo
                      administrativo.
                    </p>
                  </div>

                  <input
                    type='checkbox'
                    name='isActive'
                    checked={formState.isActive}
                    onChange={handleTopLevelChange}
                    disabled={!canManageIntegrations}
                    className='h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                </label>
              </div>

              <label className='block text-sm font-semibold text-slate-700'>
                Descricao
                <textarea
                  name='description'
                  value={formState.description}
                  onChange={handleTopLevelChange}
                  rows={3}
                  disabled={!canManageIntegrations}
                  className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                />
              </label>

              <div className='grid gap-5 md:grid-cols-2'>
                {selectedFieldDefinitions.map((field) => {
                  const value = formState.config?.[field.key];

                  if (field.type === 'checkbox') {
                    return (
                      <label
                        key={field.key}
                        className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'
                      >
                        <div>
                          <p className='text-sm font-semibold text-slate-800'>
                            {field.label}
                          </p>
                        </div>
                        <input
                          type='checkbox'
                          checked={Boolean(value)}
                          onChange={(event) =>
                            handleConfigChange(field.key, event.target.checked)
                          }
                          disabled={!canManageIntegrations}
                          className='h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                        />
                      </label>
                    );
                  }

                  if (field.type === 'tags') {
                    return (
                      <label
                        key={field.key}
                        className='block text-sm font-semibold text-slate-700'
                      >
                        {field.label}
                        <input
                          type='text'
                          value={Array.isArray(value) ? value.join(', ') : ''}
                          onChange={(event) =>
                            handleConfigChange(
                              field.key,
                              event.target.value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean)
                            )
                          }
                          disabled={!canManageIntegrations}
                          placeholder='Separe por virgula'
                          className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                        />
                      </label>
                    );
                  }

                  return (
                    <label
                      key={field.key}
                      className='block text-sm font-semibold text-slate-700'
                    >
                      {field.label}
                      <input
                        type={field.type || 'text'}
                        value={value || ''}
                        onChange={(event) =>
                          handleConfigChange(field.key, event.target.value)
                        }
                        disabled={!canManageIntegrations}
                        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                      />
                    </label>
                  );
                })}
              </div>

              <label className='block text-sm font-semibold text-slate-700'>
                Observacoes administrativas
                <textarea
                  name='notes'
                  value={formState.notes}
                  onChange={handleTopLevelChange}
                  rows={3}
                  disabled={!canManageIntegrations}
                  className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                />
              </label>

              <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
                <p className='text-xs font-semibold uppercase tracking-[0.22em] text-slate-400'>
                  Prontidao
                </p>
                <div className='mt-3 flex flex-wrap gap-3'>
                  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700'>
                    Campos pendentes: {selectedIntegration?.missingFields?.length || 0}
                  </span>
                  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700'>
                    Ultimo sucesso: {formatDateTime(selectedIntegration?.lastSuccessAt)}
                  </span>
                  <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700'>
                    Ultimo erro: {formatDateTime(selectedIntegration?.lastErrorAt)}
                  </span>
                </div>
                {selectedIntegration?.missingFields?.length ? (
                  <p className='mt-3 text-sm text-amber-700'>
                    Campos obrigatorios pendentes:{' '}
                    {selectedIntegration.missingFields.join(', ')}.
                  </p>
                ) : (
                  <p className='mt-3 text-sm text-emerald-700'>
                    Configuracao minima atendida para esta fase do conector.
                  </p>
                )}
              </div>

              <div className='flex flex-wrap items-center justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => fetchIntegrationDetail(selectedProvider)}
                  className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Recarregar
                </button>
                <button
                  type='button'
                  onClick={handleTestConnection}
                  disabled={!canManageIntegrations || testing}
                  className='rounded-2xl border border-slate-900 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {testing ? 'Testando...' : 'Testar conexão'}
                </button>
                <button
                  type='button'
                  onClick={handleSyncNow}
                  disabled={!canSyncIntegrations || syncing}
                  className='rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
                <button
                  type='submit'
                  disabled={!canManageIntegrations || saving}
                  className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {saving ? 'Salvando...' : 'Salvar integração'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='mb-5 flex items-center justify-between gap-3'>
            <div>
              <h3 className='text-2xl font-bold text-slate-900'>
                Histórico operacional
              </h3>
              <p className='mt-2 text-sm text-slate-500'>
                Eventos recentes de teste, sincronização e manutenção do hub.
              </p>
            </div>

            <button
              type='button'
              onClick={() => fetchLogs(selectedProvider)}
              className='rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
            >
              Atualizar logs
            </button>
          </div>

          {logs.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500'>
              Ainda nao existem eventos operacionais registrados para esta
              integracao.
            </div>
          ) : (
            <div className='space-y-3'>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                >
                  <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm font-semibold text-slate-900'>
                          {log.integration?.name || 'Integracao'}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            logToneClasses[log.status] || logToneClasses.PENDING
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                          {log.action}
                        </span>
                      </div>
                      <p className='mt-2 text-sm text-slate-700'>
                        {log.summary || 'Evento operacional registrado'}
                      </p>
                      {log.errorMessage ? (
                        <p className='mt-2 text-xs font-medium text-rose-700'>
                          {log.errorMessage}
                        </p>
                      ) : null}
                    </div>

                    <div className='text-right text-xs text-slate-500'>
                      <p>{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Integrations;
