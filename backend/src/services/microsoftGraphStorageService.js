import fs from 'fs/promises';
import path from 'path';
import AppError from '../errors/AppError.js';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const getClientSecret = (provider) => {
  const normalizedProvider = String(provider || '').toUpperCase();

  if (normalizedProvider === 'SHAREPOINT') {
    return (
      normalizeString(process.env.SHAREPOINT_CLIENT_SECRET) ||
      normalizeString(process.env.MICROSOFT_GRAPH_CLIENT_SECRET) ||
      normalizeString(process.env.MS_GRAPH_CLIENT_SECRET)
    );
  }

  if (normalizedProvider === 'ONEDRIVE') {
    return (
      normalizeString(process.env.ONEDRIVE_CLIENT_SECRET) ||
      normalizeString(process.env.MICROSOFT_GRAPH_CLIENT_SECRET) ||
      normalizeString(process.env.MS_GRAPH_CLIENT_SECRET)
    );
  }

  return (
    normalizeString(process.env.MICROSOFT_GRAPH_CLIENT_SECRET) ||
    normalizeString(process.env.MS_GRAPH_CLIENT_SECRET)
  );
};

const validateGraphSettings = (settings) => {
  const missingFields = [];
  const provider = String(settings?.provider || '').toUpperCase();

  if (!['SHAREPOINT', 'ONEDRIVE'].includes(provider)) {
    missingFields.push('provider');
  }

  if (!normalizeString(settings?.tenantId)) missingFields.push('tenantId');
  if (!normalizeString(settings?.clientId)) missingFields.push('clientId');
  if (!normalizeString(settings?.driveId)) missingFields.push('driveId');
  if (provider === 'SHAREPOINT' && !normalizeString(settings?.siteId)) {
    missingFields.push('siteId');
  }

  if (!getClientSecret(provider)) {
    missingFields.push('clientSecretEnv');
  }

  return missingFields;
};

const ensureGraphSettings = (settings) => {
  const missingFields = validateGraphSettings(settings);

  if (missingFields.length > 0) {
    throw new AppError(
      `Configuracao Microsoft Graph incompleta: ${missingFields.join(', ')}`,
      400
    );
  }
};

const encodeGraphPath = (value) =>
  String(value || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const sanitizePathSegment = (value, fallback = 'arquivo') => {
  const normalized = normalizeString(value) || fallback;

  return normalized
    .replace(/[\\/:*?"<>|#%{}~&]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
};

const buildCorporatePath = ({
  rootFolder,
  moduleFolder,
  entityType,
  entityId,
  employeeId,
  fileName,
}) => {
  const segments = [
    sanitizePathSegment(rootFolder || 'EloSystem', 'EloSystem'),
    sanitizePathSegment(moduleFolder || 'Arquivos', 'Arquivos'),
  ];

  if (employeeId) {
    segments.push(`Colaborador-${employeeId}`);
  }

  if (entityType && entityId) {
    segments.push(
      `${sanitizePathSegment(entityType, 'entidade')}-${sanitizePathSegment(
        entityId,
        'registro'
      )}`
    );
  }

  segments.push(sanitizePathSegment(fileName, 'arquivo'));

  return segments.join('/');
};

export const getMicrosoftGraphReadiness = (settings) => {
  const missingFields = validateGraphSettings(settings);

  return {
    ready: missingFields.length === 0,
    missingFields,
    requiresEnvironmentSecret: missingFields.includes('clientSecretEnv'),
  };
};

export const getMicrosoftGraphAccessToken = async (settings) => {
  ensureGraphSettings(settings);

  const provider = String(settings.provider).toUpperCase();
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(
    settings.tenantId
  )}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: getClientSecret(provider),
    grant_type: 'client_credentials',
    scope: GRAPH_SCOPE,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new AppError(
      payload.error_description ||
        payload.error ||
        'Falha ao autenticar no Microsoft Graph',
      response.status || 502
    );
  }

  return payload.access_token;
};

export const testMicrosoftGraphDriveConnection = async (settings) => {
  const accessToken = await getMicrosoftGraphAccessToken(settings);
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${encodeURIComponent(settings.driveId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(
      payload.error?.message || 'Falha ao validar drive no Microsoft Graph',
      response.status || 502
    );
  }

  return {
    driveId: payload.id,
    name: payload.name,
    driveType: payload.driveType,
    webUrl: payload.webUrl,
  };
};

export const uploadFileToMicrosoftGraph = async ({
  settings,
  file,
  storedPath,
  moduleFolder,
  entityType,
  entityId,
  employeeId,
  fileName,
  mimeType,
}) => {
  const accessToken = await getMicrosoftGraphAccessToken(settings);
  const localPath = file?.path || storedPath;

  if (!localPath) {
    throw new AppError('Arquivo local nao encontrado para sincronizacao', 400);
  }

  const absolutePath = path.resolve(localPath.replace(/^\/?uploads[\\/]/i, 'uploads/'));
  const buffer = await fs.readFile(absolutePath);
  const targetPath = buildCorporatePath({
    rootFolder: settings.rootFolder,
    moduleFolder,
    entityType,
    entityId,
    employeeId,
    fileName,
  });
  const encodedPath = encodeGraphPath(targetPath);
  const uploadUrl = `${GRAPH_BASE_URL}/drives/${encodeURIComponent(
    settings.driveId
  )}/root:/${encodedPath}:/content`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType || file?.mimetype || 'application/octet-stream',
    },
    body: buffer,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(
      payload.error?.message || 'Falha ao enviar arquivo para storage corporativo',
      response.status || 502
    );
  }

  return {
    externalFileId: payload.id,
    externalDriveId: payload.parentReference?.driveId || settings.driveId,
    externalSiteId: payload.sharepointIds?.siteId || settings.siteId || null,
    externalItemId: payload.sharepointIds?.listItemUniqueId || payload.id,
    externalUrl: payload.webUrl || null,
    webUrl: payload.webUrl || null,
    versionLabel: payload.eTag || payload.cTag || 'v1',
    versionNumber: 1,
    syncStatus: 'SYNCED',
    syncMessage: 'Arquivo sincronizado com storage corporativo',
    targetPath,
    size: payload.size,
  };
};
