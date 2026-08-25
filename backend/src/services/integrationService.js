import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { createAuditLog } from './auditService.js';
import {
  getStorageIntegrationSettingsService,
  syncPendingStorageObjectsService,
  testStorageProviderConnectionService,
  upsertStorageIntegrationSettingsService,
} from './storageIntegrationService.js';

const PROVIDER_CATALOG = {
  SHAREPOINT: {
    provider: 'SHAREPOINT',
    category: 'STORAGE',
    name: 'SharePoint',
    description:
      'Storage corporativo com governanca documental, bibliotecas e versionamento externo.',
    icon: 'files',
    defaultConfig: {
      tenantId: '',
      clientId: '',
      siteId: '',
      driveId: '',
      rootFolder: 'EloSystem',
      libraryName: 'Documentos',
      useAsPrimaryStorage: false,
      syncDocuments: true,
      syncAdmissions: true,
      syncWarnings: true,
      syncSuspensions: true,
      syncLeaves: true,
      syncPayslips: true,
    },
    requiredFields: ['tenantId', 'clientId', 'siteId', 'driveId', 'rootFolder'],
  },
  ONEDRIVE: {
    provider: 'ONEDRIVE',
    category: 'STORAGE',
    name: 'OneDrive corporativo',
    description:
      'Repositorio corporativo controlado para arquivos do EloSystem com pasta-raiz dedicada.',
    icon: 'cloud',
    defaultConfig: {
      tenantId: '',
      clientId: '',
      driveId: '',
      rootFolder: 'EloSystem',
      appFolder: 'EloSystem',
      useAsPrimaryStorage: false,
      syncDocuments: true,
      syncAdmissions: true,
      syncWarnings: true,
      syncSuspensions: true,
      syncLeaves: true,
      syncPayslips: true,
    },
    requiredFields: ['tenantId', 'clientId', 'driveId', 'rootFolder'],
  },
  MYAHGORA_TOTVS: {
    provider: 'MYAHGORA_TOTVS',
    category: 'TIME_TRACKING',
    name: 'MyAhgora / TOTVS',
    description:
      'Conector administrativo da Jornada para importacao por arquivo e futura automacao via API.',
    icon: 'timer',
    defaultConfig: {
      mode: 'FILE_IMPORT',
      expectedFormats: ['CSV', 'XLSX'],
      defaultLayout: 'AUTO_DETECT',
      activeProvider: 'MYAHGORA',
      importFolder: 'Jornada',
      automationEnabled: false,
    },
    requiredFields: ['mode', 'expectedFormats'],
  },
  EMAIL: {
    provider: 'EMAIL',
    category: 'COMMUNICATION',
    name: 'E-mail corporativo',
    description:
      'Canal de envio para notificacoes, recuperacao de senha e comunicacoes administrativas.',
    icon: 'mail',
    defaultConfig: {
      providerName: 'SMTP corporativo',
      senderName: 'EloSystem',
      senderEmail: '',
      replyTo: '',
      notificationsEnabled: true,
      alertsEnabled: true,
    },
    requiredFields: ['providerName', 'senderName', 'senderEmail'],
  },
  API_WEBHOOKS: {
    provider: 'API_WEBHOOKS',
    category: 'PLATFORM',
    name: 'APIs e Webhooks',
    description:
      'Base para integracoes externas por endpoint, eventos e conectores da plataforma.',
    icon: 'webhook',
    defaultConfig: {
      baseUrl: '',
      webhookEndpoint: '/webhooks/eloreceiver',
      keyLabel: '',
      supportedEvents: [
        'documents.updated',
        'payroll.closed',
        'audit.critical',
      ],
      outboundEnabled: false,
    },
    requiredFields: ['webhookEndpoint'],
  },
  FUTURE: {
    provider: 'FUTURE',
    category: 'PLATFORM',
    name: 'Futuras integracoes',
    description:
      'Roadmap operacional para conectores enterprise e automacoes futuras do EloSystem.',
    icon: 'sparkles',
    defaultConfig: {
      roadmapItems: [
        'SSO corporativo',
        'Delta sync de documentos',
        'Conectores financeiros',
      ],
      sandboxReady: true,
    },
    requiredFields: [],
  },
};

const STORAGE_PROVIDER_SET = new Set(['SHAREPOINT', 'ONEDRIVE']);

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
};

const mergeConfig = (provider, incomingConfig = {}, currentConfig = {}) => {
  const defaults = PROVIDER_CATALOG[provider]?.defaultConfig || {};
  const merged = {
    ...defaults,
    ...(currentConfig || {}),
    ...(incomingConfig || {}),
  };

  Object.keys(merged).forEach((key) => {
    const value = merged[key];

    if (typeof value === 'string') {
      merged[key] = value.trim();
    }
  });

  return merged;
};

const getMissingRequiredFields = (provider, config = {}) => {
  const requiredFields = PROVIDER_CATALOG[provider]?.requiredFields || [];

  return requiredFields.filter((field) => {
    const value = config[field];

    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'boolean') return false;

    return value === undefined || value === null || String(value).trim() === '';
  });
};

const resolveStatusFromConfig = ({ provider, isActive, config = {} }) => {
  if (!isActive) {
    return 'INATIVA';
  }

  const missingFields = getMissingRequiredFields(provider, config);

  if (missingFields.length > 0) {
    return 'CONFIGURACAO_PENDENTE';
  }

  if (provider === 'FUTURE') {
    return 'EM_IMPLANTACAO';
  }

  return 'CONECTADA';
};

const buildConnectionPayload = ({
  provider,
  companyId,
  currentConnection = null,
  payload = {},
  user = null,
}) => {
  const catalog = PROVIDER_CATALOG[provider];
  const currentConfig = currentConnection?.configJson || {};
  const nextConfig = mergeConfig(provider, payload.config || payload, currentConfig);
  const isActive =
    payload.isActive === undefined
      ? currentConnection?.isActive ?? false
      : Boolean(payload.isActive);
  const status =
    payload.status || resolveStatusFromConfig({ provider, isActive, config: nextConfig });

  return {
    companyId: Number(companyId),
    provider,
    category: catalog.category,
    name: payload.name || currentConnection?.name || catalog.name,
    description:
      payload.description || currentConnection?.description || catalog.description,
    status,
    isActive,
    configJson: nextConfig,
    notes: normalizeString(payload.notes) ?? currentConnection?.notes ?? null,
    lastErrorMessage:
      payload.lastErrorMessage === undefined
        ? currentConnection?.lastErrorMessage ?? null
        : normalizeString(payload.lastErrorMessage),
    createdByUserId: currentConnection?.createdByUserId ?? user?.userId ?? null,
    updatedByUserId: user?.userId ?? currentConnection?.updatedByUserId ?? null,
  };
};

const getCatalogList = () =>
  Object.values(PROVIDER_CATALOG).map((entry) => ({
    provider: entry.provider,
    category: entry.category,
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    defaultConfig: entry.defaultConfig,
    requiredFields: entry.requiredFields,
  }));

const ensureDefaultIntegrationConnections = async (companyId) => {
  const normalizedCompanyId = Number(companyId);

  await Promise.all(
    Object.values(PROVIDER_CATALOG).map((catalog) =>
      prisma.integrationConnection.upsert({
        where: {
          companyId_provider: {
            companyId: normalizedCompanyId,
            provider: catalog.provider,
          },
        },
        create: {
          companyId: normalizedCompanyId,
          provider: catalog.provider,
          category: catalog.category,
          name: catalog.name,
          description: catalog.description,
          configJson: catalog.defaultConfig,
          status:
            catalog.provider === 'FUTURE' ? 'EM_IMPLANTACAO' : 'CONFIGURACAO_PENDENTE',
          isActive: false,
        },
        update: {},
      })
    )
  );
};

const syncStorageSettingsIntoConnections = async (companyId) => {
  const storageSettings = await getStorageIntegrationSettingsService(companyId);
  const storageConnections = await prisma.integrationConnection.findMany({
    where: {
      companyId: Number(companyId),
      provider: {
        in: ['SHAREPOINT', 'ONEDRIVE'],
      },
    },
  });

  await Promise.all(
    storageConnections.map((connection) => {
      const currentConfig = connection.configJson || {};
      const isPrimaryProvider = storageSettings.provider === connection.provider;

      const nextConfig = {
        ...currentConfig,
        tenantId:
          isPrimaryProvider && storageSettings.tenantId
            ? storageSettings.tenantId
            : currentConfig.tenantId || '',
        clientId:
          isPrimaryProvider && storageSettings.clientId
            ? storageSettings.clientId
            : currentConfig.clientId || '',
        siteId:
          connection.provider === 'SHAREPOINT' && isPrimaryProvider
            ? storageSettings.siteId || currentConfig.siteId || ''
            : currentConfig.siteId || '',
        driveId:
          isPrimaryProvider && storageSettings.driveId
            ? storageSettings.driveId
            : currentConfig.driveId || '',
        rootFolder:
          isPrimaryProvider && storageSettings.rootFolder
            ? storageSettings.rootFolder
            : currentConfig.rootFolder || 'EloSystem',
        useAsPrimaryStorage: isPrimaryProvider && storageSettings.isActive,
        syncDocuments:
          currentConfig.syncDocuments ?? storageSettings.syncDocuments ?? true,
        syncAdmissions:
          currentConfig.syncAdmissions ?? storageSettings.syncAdmissions ?? true,
        syncWarnings:
          currentConfig.syncWarnings ?? storageSettings.syncWarnings ?? true,
        syncSuspensions:
          currentConfig.syncSuspensions ?? storageSettings.syncSuspensions ?? true,
        syncLeaves: currentConfig.syncLeaves ?? storageSettings.syncLeaves ?? true,
        syncPayslips:
          currentConfig.syncPayslips ?? storageSettings.syncPayslips ?? true,
      };

      const nextIsActive = isPrimaryProvider
        ? Boolean(storageSettings.isActive)
        : connection.isActive;

      return prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          configJson: nextConfig,
          isActive: nextIsActive,
          status: resolveStatusFromConfig({
            provider: connection.provider,
            isActive: nextIsActive,
            config: nextConfig,
          }),
        },
      });
    })
  );

  return storageSettings;
};

const buildStorageOverview = async (companyId, storageSettings) => {
  const [totalObjects, syncedObjects, failedObjects, recentObjects] =
    await Promise.all([
      prisma.storageObject.count({
        where: { companyId: Number(companyId) },
      }),
      prisma.storageObject.count({
        where: {
          companyId: Number(companyId),
          syncStatus: {
            in: ['SYNCED', 'PENDING'],
          },
        },
      }),
      prisma.storageObject.count({
        where: {
          companyId: Number(companyId),
          syncStatus: 'FAILED',
        },
      }),
      prisma.storageObject.count({
        where: {
          companyId: Number(companyId),
          createdAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
          },
        },
      }),
    ]);

  return {
    provider: storageSettings.provider,
    isActive: storageSettings.isActive,
    rootFolder: storageSettings.rootFolder,
    allowLocalFallback: storageSettings.allowLocalFallback,
    totalObjects,
    syncedObjects,
    failedObjects,
    recentObjects,
  };
};

const serializeConnection = (connection) => {
  const catalog = PROVIDER_CATALOG[connection.provider];
  const config = connection.configJson || {};
  const missingFields = getMissingRequiredFields(connection.provider, config);

  return {
    ...connection,
    icon: catalog?.icon || 'plug',
    requiredFields: catalog?.requiredFields || [],
    missingFields,
    isReady: missingFields.length === 0,
  };
};

export const listIntegrationOverviewService = async (user) => {
  const companyId = Number(user.companyId);
  await ensureDefaultIntegrationConnections(companyId);
  const storageSettings = await syncStorageSettingsIntoConnections(companyId);

  const [connections, recentLogs] = await Promise.all([
    prisma.integrationConnection.findMany({
      where: { companyId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.integrationSyncLog.findMany({
      where: { companyId },
      include: {
        integration: {
          select: {
            provider: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,
    }),
  ]);

  const serializedConnections = connections.map(serializeConnection);
  const connectedCount = serializedConnections.filter(
    (connection) => connection.status === 'CONECTADA'
  ).length;
  const issueCount = serializedConnections.filter((connection) =>
    ['CONFIGURACAO_PENDENTE', 'ERRO'].includes(connection.status)
  ).length;
  const activeCount = serializedConnections.filter(
    (connection) => connection.isActive
  ).length;
  const lastSync = recentLogs[0]?.createdAt || null;

  return {
    integrations: serializedConnections,
    catalog: getCatalogList(),
    storageOverview: await buildStorageOverview(companyId, storageSettings),
    recentLogs,
    summary: {
      total: serializedConnections.length,
      connected: connectedCount,
      issues: issueCount,
      active: activeCount,
      lastSync,
    },
  };
};

export const getIntegrationByProviderService = async (provider, user) => {
  const normalizedProvider = String(provider || '').toUpperCase();

  if (!PROVIDER_CATALOG[normalizedProvider]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  const companyId = Number(user.companyId);
  await ensureDefaultIntegrationConnections(companyId);
  await syncStorageSettingsIntoConnections(companyId);

  const connection = await prisma.integrationConnection.findUnique({
    where: {
      companyId_provider: {
        companyId,
        provider: normalizedProvider,
      },
    },
    include: {
      syncLogs: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 15,
      },
    },
  });

  if (!connection) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return serializeConnection(connection);
};

const persistStorageSettingsIfNeeded = async (provider, payload, connectionData, companyId) => {
  if (!STORAGE_PROVIDER_SET.has(provider)) {
    return null;
  }

  const config = connectionData.configJson || {};
  const useAsPrimaryStorage =
    payload.useAsPrimaryStorage !== undefined
      ? Boolean(payload.useAsPrimaryStorage)
        : Boolean(config.useAsPrimaryStorage);

  if (useAsPrimaryStorage) {
    return upsertStorageIntegrationSettingsService(companyId, {
      provider,
      tenantId: normalizeString(config.tenantId),
      clientId: normalizeString(config.clientId),
      siteId: normalizeString(config.siteId),
      driveId: normalizeString(config.driveId),
      rootFolder: normalizeString(config.rootFolder) || 'EloSystem',
      isActive: Boolean(connectionData.isActive),
      syncDocuments: normalizeBoolean(config.syncDocuments, true),
      syncAdmissions: normalizeBoolean(config.syncAdmissions, true),
      syncWarnings: normalizeBoolean(config.syncWarnings, true),
      syncSuspensions: normalizeBoolean(config.syncSuspensions, true),
      syncLeaves: normalizeBoolean(config.syncLeaves, true),
      syncPayslips: normalizeBoolean(config.syncPayslips, true),
      notes: normalizeString(connectionData.notes),
    });
  }

  const currentStorageSettings = await getStorageIntegrationSettingsService(companyId);

  if (currentStorageSettings.provider === provider) {
    return upsertStorageIntegrationSettingsService(companyId, {
      provider: 'LOCAL',
      tenantId: null,
      clientId: null,
      siteId: null,
      driveId: null,
      rootFolder: normalizeString(config.rootFolder) || currentStorageSettings.rootFolder,
      isActive: false,
      notes: normalizeString(connectionData.notes),
    });
  }

  return null;
};

export const upsertIntegrationConnectionService = async (provider, payload, user, req) => {
  const normalizedProvider = String(provider || '').toUpperCase();

  if (!PROVIDER_CATALOG[normalizedProvider]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  const companyId = Number(user.companyId);
  await ensureDefaultIntegrationConnections(companyId);

  const currentConnection = await prisma.integrationConnection.findUnique({
    where: {
      companyId_provider: {
        companyId,
        provider: normalizedProvider,
      },
    },
  });

  const connectionData = buildConnectionPayload({
    provider: normalizedProvider,
    companyId,
    currentConnection,
    payload,
    user,
  });

  const nextConnection = await prisma.integrationConnection.upsert({
    where: {
      companyId_provider: {
        companyId,
        provider: normalizedProvider,
      },
    },
    create: connectionData,
    update: {
      name: connectionData.name,
      description: connectionData.description,
      status: connectionData.status,
      isActive: connectionData.isActive,
      configJson: connectionData.configJson,
      notes: connectionData.notes,
      lastErrorMessage: connectionData.lastErrorMessage,
      updatedByUserId: connectionData.updatedByUserId,
    },
  });

  await persistStorageSettingsIfNeeded(
    normalizedProvider,
    payload,
    connectionData,
    companyId
  );

  await createAuditLog({
    req,
    user,
    module: 'integrations',
    entityType: 'integration_connection',
    entityId: nextConnection.id,
    action: currentConnection ? 'UPDATE' : 'CREATE',
    severity: 'INFO',
    summary: `${currentConnection ? 'Configuracao atualizada' : 'Integracao criada'}: ${nextConnection.name}`,
    before: currentConnection,
    after: nextConnection,
    details: {
      provider: normalizedProvider,
      category: nextConnection.category,
    },
  });

  return getIntegrationByProviderService(normalizedProvider, user);
};

const createIntegrationLog = async ({
  integrationId,
  companyId,
  createdByUserId,
  action,
  status,
  summary,
  details = null,
  errorMessage = null,
}) =>
  prisma.integrationSyncLog.create({
    data: {
      integrationId: Number(integrationId),
      companyId: Number(companyId),
      createdByUserId: createdByUserId ? Number(createdByUserId) : null,
      action,
      status,
      startedAt: new Date(),
      finishedAt: new Date(),
      summary,
      detailsJson: details,
      errorMessage,
    },
  });

const updateConnectionOperationalState = async (connectionId, payload = {}) =>
  prisma.integrationConnection.update({
    where: { id: Number(connectionId) },
    data: payload,
  });

export const testIntegrationConnectionService = async (provider, user, req) => {
  const connection = await getIntegrationByProviderService(provider, user);
  const missingFields = connection.missingFields || [];
  const baseDetails = {
    provider: connection.provider,
    category: connection.category,
    missingFields,
  };

  let status = 'SUCCESS';
  let summary = 'Configuracao validada com sucesso';
  let severity = 'INFO';
  let nextStatus = connection.status;
  let errorMessage = null;

  if (STORAGE_PROVIDER_SET.has(connection.provider) && connection.isActive) {
    try {
      const storageTest = await testStorageProviderConnectionService(
        user.companyId
      );

      status = storageTest.status;
      summary = storageTest.summary;
      severity = storageTest.status === 'ERROR' ? 'CRITICAL' : 'INFO';
      nextStatus =
        storageTest.status === 'SUCCESS'
          ? 'CONECTADA'
          : storageTest.status === 'ERROR'
            ? 'ERRO'
            : 'CONFIGURACAO_PENDENTE';
      errorMessage =
        storageTest.status === 'ERROR' ? storageTest.summary : null;
      baseDetails.storageTest = storageTest;
    } catch (error) {
      status = 'ERROR';
      summary = error.message || 'Falha ao testar storage corporativo';
      severity = 'CRITICAL';
      nextStatus = 'ERRO';
      errorMessage = summary;
      baseDetails.storageTest = {
        status,
        summary,
      };
    }
  } else if (!connection.isActive) {
    status = 'WARNING';
    summary = 'Integracao marcada como inativa; teste validou apenas configuracao administrativa';
    severity = 'WARNING';
    nextStatus = 'INATIVA';
  } else if (missingFields.length > 0) {
    status = 'ERROR';
    summary = 'Configuracao incompleta para esta integracao';
    severity = 'WARNING';
    nextStatus = 'CONFIGURACAO_PENDENTE';
    errorMessage = `Campos obrigatorios ausentes: ${missingFields.join(', ')}`;
  } else if (connection.provider === 'FUTURE') {
    status = 'WARNING';
    summary = 'Roadmap validado; integracao ainda em implantacao';
    severity = 'INFO';
    nextStatus = 'EM_IMPLANTACAO';
  } else {
    nextStatus = 'CONECTADA';
  }

  const log = await createIntegrationLog({
    integrationId: connection.id,
    companyId: user.companyId,
    createdByUserId: user.userId,
    action: 'TEST_CONNECTION',
    status,
    summary,
    details: baseDetails,
    errorMessage,
  });

  await updateConnectionOperationalState(connection.id, {
    status: nextStatus,
    lastSuccessAt: status === 'SUCCESS' ? new Date() : connection.lastSuccessAt,
    lastErrorAt: status === 'ERROR' ? new Date() : connection.lastErrorAt,
    lastErrorMessage: errorMessage,
    recentOperations: {
      increment: 1,
    },
    totalOperations: {
      increment: 1,
    },
  });

  await createAuditLog({
    req,
    user,
    module: 'integrations',
    entityType: 'integration_connection',
    entityId: connection.id,
    action: 'TEST_CONNECTION',
    severity,
    summary,
    details: baseDetails,
  });

  return {
    result: {
      status,
      summary,
      missingFields,
      logId: log.id,
    },
    integration: await getIntegrationByProviderService(provider, user),
  };
};

export const triggerIntegrationSyncService = async (provider, user, req) => {
  const connection = await getIntegrationByProviderService(provider, user);
  const missingFields = connection.missingFields || [];
  let status = 'SUCCESS';
  let summary = 'Sincronizacao administrativa registrada com sucesso';
  let severity = 'INFO';
  let errorMessage = null;

  let storageSyncResult = null;

  if (STORAGE_PROVIDER_SET.has(connection.provider) && connection.isActive) {
    storageSyncResult = await syncPendingStorageObjectsService(
      user.companyId,
      user
    );
    status =
      storageSyncResult.status === 'SUCCESS'
        ? 'SUCCESS'
        : storageSyncResult.status === 'ERROR'
          ? 'ERROR'
          : 'WARNING';
    summary = storageSyncResult.summary;
    severity = status === 'ERROR' ? 'CRITICAL' : 'INFO';
    errorMessage = status === 'ERROR' ? storageSyncResult.summary : null;
  } else if (!connection.isActive) {
    status = 'WARNING';
    summary = 'Integracao inativa; nenhuma sincronizacao operacional foi executada';
    severity = 'WARNING';
  } else if (missingFields.length > 0) {
    status = 'ERROR';
    summary = 'Nao foi possivel sincronizar por configuracao incompleta';
    severity = 'CRITICAL';
    errorMessage = `Campos obrigatorios ausentes: ${missingFields.join(', ')}`;
  } else if (connection.provider === 'MYAHGORA_TOTVS') {
    status = 'WARNING';
    summary =
      'Conector pronto para importacao por arquivo. Sincronizacao automatica via API permanece em roadmap.';
    severity = 'INFO';
  } else if (connection.provider === 'FUTURE') {
    status = 'WARNING';
    summary = 'Integracao em roadmap; apenas rastreabilidade administrativa foi registrada';
    severity = 'INFO';
  } else if (connection.provider === 'EMAIL') {
    summary = 'Canal de e-mail validado e preparado para envios futuros do EloSystem';
  } else {
    summary =
      'Integracao registrada como pronta para operacoes documentais e sincronizacao corporativa';
  }

  const now = new Date();
  const log = await createIntegrationLog({
    integrationId: connection.id,
    companyId: user.companyId,
    createdByUserId: user.userId,
    action: 'SYNC_NOW',
    status,
    summary,
    details: {
      provider: connection.provider,
      category: connection.category,
      missingFields,
      storageSyncResult,
    },
    errorMessage,
  });

  await updateConnectionOperationalState(connection.id, {
    lastSyncAt: now,
    lastSuccessAt: status === 'SUCCESS' ? now : connection.lastSuccessAt,
    lastErrorAt: status === 'ERROR' ? now : connection.lastErrorAt,
    lastErrorMessage: errorMessage,
    status:
      status === 'ERROR'
        ? 'ERRO'
        : connection.provider === 'FUTURE'
          ? 'EM_IMPLANTACAO'
          : connection.isActive
            ? 'CONECTADA'
            : 'INATIVA',
    recentOperations: {
      increment: 1,
    },
    totalOperations: {
      increment: 1,
    },
  });

  await createAuditLog({
    req,
    user,
    module: 'integrations',
    entityType: 'integration_connection',
    entityId: connection.id,
    action: 'PROCESS',
    severity,
    summary,
    details: {
      provider: connection.provider,
      logId: log.id,
    },
  });

  return {
    result: {
      status,
      summary,
      logId: log.id,
    },
    integration: await getIntegrationByProviderService(provider, user),
  };
};

export const listIntegrationLogsService = async (query = {}, user) => {
  const where = {
    companyId: Number(user.companyId),
  };

  if (query.provider && PROVIDER_CATALOG[String(query.provider).toUpperCase()]) {
    where.integration = {
      provider: String(query.provider).toUpperCase(),
    };
  }

  if (query.status && query.status !== 'TODOS') {
    where.status = String(query.status).toUpperCase();
  }

  return prisma.integrationSyncLog.findMany({
    where,
    include: {
      integration: {
        select: {
          provider: true,
          name: true,
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: query.limit ? Number(query.limit) : 50,
  });
};
