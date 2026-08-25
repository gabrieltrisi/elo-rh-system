import prisma from '../prisma/client.js';
import { buildUploadedFileUrl } from '../utils/filePath.js';
import {
  getMicrosoftGraphReadiness,
  testMicrosoftGraphDriveConnection,
  uploadFileToMicrosoftGraph,
} from './microsoftGraphStorageService.js';

const MODULE_ROOT_FOLDERS = {
  documents: 'Documentacao',
  admission: 'PreAdmissao',
  warnings: 'Advertencias',
  suspensions: 'Suspensoes',
  leave: 'Afastamentos',
  leaves: 'Afastamentos',
  payslips: 'Holerites',
  reports: 'Relatorios',
  'official-pdfs': 'DocumentosOficiais',
  onboarding: 'Onboarding',
  benefits: 'Beneficios',
  uniforms: 'Fardamento',
  trainings: 'Treinamentos',
};

const MODULE_SYNC_FLAGS = {
  documents: 'syncDocuments',
  documentation: 'syncDocuments',
  admission: 'syncAdmissions',
  warnings: 'syncWarnings',
  suspensions: 'syncSuspensions',
  leave: 'syncLeaves',
  leaves: 'syncLeaves',
  payslips: 'syncPayslips',
  reports: 'syncDocuments',
  'official-pdfs': 'syncDocuments',
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

export const getStorageIntegrationSettingsService = async (companyId) => {
  let settings = await prisma.storageIntegrationSetting.findUnique({
    where: {
      companyId: Number(companyId),
    },
  });

  if (!settings) {
    settings = await prisma.storageIntegrationSetting.create({
      data: {
        companyId: Number(companyId),
        provider: 'LOCAL',
        rootFolder: 'EloSystem',
        isActive: false,
        allowLocalFallback: true,
      },
    });
  }

  return settings;
};

const shouldSyncModule = (settings, module) => {
  const flag = MODULE_SYNC_FLAGS[module];

  if (!flag) {
    return false;
  }

  return settings[flag] !== false;
};

const getStorageConnection = async (tx, companyId, provider) => {
  if (!provider || provider === 'LOCAL') return null;

  return tx.integrationConnection.findUnique({
    where: {
      companyId_provider: {
        companyId: Number(companyId),
        provider,
      },
    },
  });
};

const createStorageSyncLog = async (
  tx,
  {
    companyId,
    provider,
    action,
    status,
    summary,
    details = null,
    errorMessage = null,
    createdByUserId = null,
  }
) => {
  const connection = await getStorageConnection(tx, companyId, provider);

  if (!connection) return null;

  const log = await tx.integrationSyncLog.create({
    data: {
      integrationId: connection.id,
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

  await tx.integrationConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSuccessAt: status === 'SUCCESS' ? new Date() : connection.lastSuccessAt,
      lastErrorAt: status === 'ERROR' ? new Date() : connection.lastErrorAt,
      lastErrorMessage: errorMessage,
      status: status === 'ERROR' ? 'ERRO' : connection.status,
      recentOperations: {
        increment: 1,
      },
      totalOperations: {
        increment: 1,
      },
    },
  });

  return log;
};

export const upsertStorageIntegrationSettingsService = async (
  companyId,
  payload = {}
) => {
  const data = {
    provider: payload.provider || 'LOCAL',
    tenantId: normalizeOptionalString(payload.tenantId),
    clientId: normalizeOptionalString(payload.clientId),
    siteId: normalizeOptionalString(payload.siteId),
    driveId: normalizeOptionalString(payload.driveId),
    rootFolder: normalizeOptionalString(payload.rootFolder) || 'EloSystem',
    isActive: Boolean(payload.isActive),
    allowLocalFallback:
      payload.allowLocalFallback === undefined
        ? true
        : Boolean(payload.allowLocalFallback),
    syncDocuments:
      payload.syncDocuments === undefined ? true : Boolean(payload.syncDocuments),
    syncAdmissions:
      payload.syncAdmissions === undefined
        ? true
        : Boolean(payload.syncAdmissions),
    syncWarnings:
      payload.syncWarnings === undefined ? true : Boolean(payload.syncWarnings),
    syncSuspensions:
      payload.syncSuspensions === undefined
        ? true
        : Boolean(payload.syncSuspensions),
    syncLeaves:
      payload.syncLeaves === undefined ? true : Boolean(payload.syncLeaves),
    syncPayslips:
      payload.syncPayslips === undefined ? true : Boolean(payload.syncPayslips),
    notes: normalizeOptionalString(payload.notes),
  };

  return prisma.storageIntegrationSetting.upsert({
    where: {
      companyId: Number(companyId),
    },
    create: {
      companyId: Number(companyId),
      ...data,
    },
    update: data,
  });
};

export const testStorageProviderConnectionService = async (companyId) => {
  const settings = await getStorageIntegrationSettingsService(companyId);
  const readiness = getMicrosoftGraphReadiness(settings);

  if (!settings.isActive || settings.provider === 'LOCAL') {
    return {
      status: 'WARNING',
      summary: 'Storage corporativo inativo; fallback local permanece ativo',
      readiness,
      drive: null,
    };
  }

  if (!readiness.ready) {
    return {
      status: 'ERROR',
      summary: `Configuracao incompleta: ${readiness.missingFields.join(', ')}`,
      readiness,
      drive: null,
    };
  }

  const drive = await testMicrosoftGraphDriveConnection(settings);

  return {
    status: 'SUCCESS',
    summary: `Conexao validada com drive ${drive.name || drive.driveId}`,
    readiness,
    drive,
  };
};

export const registerManagedFileService = async ({
  tx = prisma,
  companyId,
  module,
  entityType,
  entityId = null,
  employeeId = null,
  uploadedByUserId = null,
  file = null,
  originalName = null,
  mimeType = null,
  size = null,
  storedName = null,
  storedPath = null,
  externalMeta = null,
} = {}) => {
  const settings = await getStorageIntegrationSettingsService(companyId);
  const requestedProvider =
    settings.isActive &&
    settings.provider !== 'LOCAL' &&
    shouldSyncModule(settings, module)
      ? settings.provider
      : 'LOCAL';
  let provider = requestedProvider;
  let resolvedExternalMeta = externalMeta || null;
  let syncStatusOverride = null;
  let syncMessageOverride = null;
  const resolvedOriginalName =
    normalizeOptionalString(originalName) ||
    normalizeOptionalString(file?.originalname) ||
    normalizeOptionalString(file?.filename);
  const resolvedStoredName =
    normalizeOptionalString(storedName) ||
    normalizeOptionalString(file?.filename) ||
    resolvedOriginalName;
  const resolvedPath =
    normalizeOptionalString(storedPath) ||
    normalizeOptionalString(buildUploadedFileUrl(file));
  const logicalKey = [
    normalizeOptionalString(settings.rootFolder) || 'EloSystem',
    MODULE_ROOT_FOLDERS[module] || module || 'Arquivos',
    resolvedStoredName,
  ]
    .filter(Boolean)
    .join('/');

  if (provider !== 'LOCAL' && !resolvedExternalMeta) {
    try {
      resolvedExternalMeta = await uploadFileToMicrosoftGraph({
        settings,
        file,
        storedPath,
        moduleFolder: MODULE_ROOT_FOLDERS[module] || module || 'Arquivos',
        entityType,
        entityId,
        employeeId,
        fileName: resolvedStoredName || resolvedOriginalName || 'arquivo',
        mimeType:
          normalizeOptionalString(mimeType) ||
          normalizeOptionalString(file?.mimetype) ||
          'application/octet-stream',
      });

      syncStatusOverride = 'SYNCED';
      syncMessageOverride = 'Arquivo sincronizado com storage corporativo';

      await createStorageSyncLog(tx, {
        companyId,
        provider,
        action: 'UPLOAD_FILE',
        status: 'SUCCESS',
        summary: `Arquivo sincronizado em ${provider}`,
        details: {
          module,
          entityType,
          entityId,
          logicalKey,
          targetPath: resolvedExternalMeta.targetPath,
          webUrl: resolvedExternalMeta.webUrl,
        },
        createdByUserId: uploadedByUserId,
      });
    } catch (error) {
      syncStatusOverride = 'FAILED';
      syncMessageOverride = error.message || 'Falha ao sincronizar arquivo';

      await createStorageSyncLog(tx, {
        companyId,
        provider,
        action: 'UPLOAD_FILE',
        status: 'ERROR',
        summary: `Falha ao sincronizar arquivo em ${provider}`,
        details: {
          module,
          entityType,
          entityId,
          logicalKey,
        },
        errorMessage: syncMessageOverride,
        createdByUserId: uploadedByUserId,
      });

      if (!settings.allowLocalFallback) {
        throw error;
      }
    }
  }

  return tx.storageObject.create({
    data: {
      companyId: Number(companyId),
      provider,
      module: normalizeOptionalString(module) || 'documents',
      entityType: normalizeOptionalString(entityType) || 'document',
      entityId:
        entityId === undefined || entityId === null ? null : Number(entityId),
      employeeId: employeeId ? Number(employeeId) : null,
      uploadedByUserId: uploadedByUserId ? Number(uploadedByUserId) : null,
      originalName: resolvedOriginalName || 'arquivo',
      storedName: resolvedStoredName || 'arquivo',
      fileName: resolvedOriginalName || resolvedStoredName || 'arquivo',
      mimeType:
        normalizeOptionalString(mimeType) ||
        normalizeOptionalString(file?.mimetype) ||
        'application/octet-stream',
      size: size !== null && size !== undefined ? Number(size) : file?.size || 0,
      path: resolvedPath || '/',
      localFallbackPath:
        provider === 'LOCAL' ? resolvedPath || null : resolvedPath || null,
      externalFileId: normalizeOptionalString(resolvedExternalMeta?.externalFileId),
      externalDriveId: normalizeOptionalString(
        resolvedExternalMeta?.externalDriveId
      ),
      externalSiteId: normalizeOptionalString(resolvedExternalMeta?.externalSiteId),
      externalItemId: normalizeOptionalString(resolvedExternalMeta?.externalItemId),
      externalUrl: normalizeOptionalString(resolvedExternalMeta?.externalUrl),
      webUrl: normalizeOptionalString(resolvedExternalMeta?.webUrl),
      logicalKey,
      versionNumber:
        resolvedExternalMeta?.versionNumber !== undefined &&
        resolvedExternalMeta?.versionNumber !== null
          ? Number(resolvedExternalMeta.versionNumber)
          : 1,
      versionLabel:
        normalizeOptionalString(resolvedExternalMeta?.versionLabel) || 'v1',
      syncStatus:
        provider === 'LOCAL'
          ? 'LOCAL_ONLY'
          : syncStatusOverride ||
            normalizeOptionalString(resolvedExternalMeta?.syncStatus) ||
            'PENDING',
      syncMessage:
        syncMessageOverride || normalizeOptionalString(resolvedExternalMeta?.syncMessage),
      isCurrent: true,
    },
  });
};

export const syncPendingStorageObjectsService = async (companyId, user = null) => {
  const settings = await getStorageIntegrationSettingsService(companyId);

  if (!settings.isActive || settings.provider === 'LOCAL') {
    return {
      status: 'WARNING',
      summary: 'Storage corporativo inativo; nenhuma sincronizacao executada',
      processed: 0,
      synced: 0,
      failed: 0,
    };
  }

  const readiness = getMicrosoftGraphReadiness(settings);

  if (!readiness.ready) {
    return {
      status: 'ERROR',
      summary: `Configuracao incompleta: ${readiness.missingFields.join(', ')}`,
      processed: 0,
      synced: 0,
      failed: 0,
    };
  }

  const objects = await prisma.storageObject.findMany({
    where: {
      companyId: Number(companyId),
      provider: {
        in: ['LOCAL', settings.provider],
      },
      syncStatus: {
        in: ['LOCAL_ONLY', 'PENDING', 'FAILED'],
      },
      localFallbackPath: {
        not: null,
      },
      isCurrent: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 25,
  });

  let synced = 0;
  let failed = 0;

  for (const object of objects) {
    if (!shouldSyncModule(settings, object.module)) {
      continue;
    }

    try {
      const externalMeta = await uploadFileToMicrosoftGraph({
        settings,
        storedPath: object.localFallbackPath || object.path,
        moduleFolder:
          MODULE_ROOT_FOLDERS[object.module] || object.module || 'Arquivos',
        entityType: object.entityType,
        entityId: object.entityId,
        employeeId: object.employeeId,
        fileName: object.storedName || object.fileName,
        mimeType: object.mimeType,
      });

      await prisma.storageObject.update({
        where: { id: object.id },
        data: {
          provider: settings.provider,
          externalFileId: externalMeta.externalFileId,
          externalDriveId: externalMeta.externalDriveId,
          externalSiteId: externalMeta.externalSiteId,
          externalItemId: externalMeta.externalItemId,
          externalUrl: externalMeta.externalUrl,
          webUrl: externalMeta.webUrl,
          versionLabel: externalMeta.versionLabel,
          syncStatus: 'SYNCED',
          syncMessage: 'Arquivo sincronizado com storage corporativo',
        },
      });

      await createStorageSyncLog(prisma, {
        companyId,
        provider: settings.provider,
        action: 'SYNC_PENDING_FILE',
        status: 'SUCCESS',
        summary: `Arquivo pendente sincronizado em ${settings.provider}`,
        details: {
          storageObjectId: object.id,
          module: object.module,
          targetPath: externalMeta.targetPath,
        },
        createdByUserId: user?.userId,
      });

      synced += 1;
    } catch (error) {
      await prisma.storageObject.update({
        where: { id: object.id },
        data: {
          provider: settings.provider,
          syncStatus: 'FAILED',
          syncMessage: error.message || 'Falha ao sincronizar arquivo pendente',
        },
      });

      await createStorageSyncLog(prisma, {
        companyId,
        provider: settings.provider,
        action: 'SYNC_PENDING_FILE',
        status: 'ERROR',
        summary: `Falha ao sincronizar arquivo pendente em ${settings.provider}`,
        details: {
          storageObjectId: object.id,
          module: object.module,
        },
        errorMessage: error.message,
        createdByUserId: user?.userId,
      });

      failed += 1;
    }
  }

  return {
    status: failed > 0 ? 'WARNING' : 'SUCCESS',
    summary: `${synced} arquivo(s) sincronizado(s), ${failed} falha(s)`,
    processed: objects.length,
    synced,
    failed,
  };
};
