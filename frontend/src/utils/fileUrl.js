import api from '../services/api';

const FILE_MODULE_ALIASES = {
  documentation: 'documentation',
  documents: 'documentation',
  suspensions: 'suspensions',
  trainings: 'trainings',
  certificates: 'certificates',
  'medical-certificates': 'certificates',
  warnings: 'warnings',
  leave: 'leave',
  leaves: 'leave',
  admission: 'admission',
  benefits: 'benefits',
  onboarding: 'onboarding',
  uniforms: 'uniforms',
  recruitment: 'recruitment',
};

const getApiBaseUrl = () => String(api.defaults.baseURL || '').replace(/\/$/, '');

export const isDataUrl = (value) => /^data:/i.test(String(value || '').trim());

const normalizeModule = (moduleKey) => {
  const normalized = String(moduleKey || '').trim().toLowerCase();
  return FILE_MODULE_ALIASES[normalized] || normalized || 'documents';
};

const toPathname = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw || isDataUrl(raw)) return raw;

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).pathname || '';
    }
  } catch {
    return raw;
  }

  return raw;
};

export const extractFileReference = (fileValue, fallbackModule = '') => {
  if (!fileValue) {
    return {
      module: normalizeModule(fallbackModule),
      filename: '',
      originalPath: '',
      isDataUrl: false,
    };
  }

  if (isDataUrl(fileValue)) {
    return {
      module: normalizeModule(fallbackModule),
      filename: '',
      originalPath: String(fileValue),
      isDataUrl: true,
    };
  }

  const pathname = toPathname(fileValue)
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/');

  const filesMatch = pathname.match(
    /^\/?files\/([^/]+)\/(?:view\/|download\/)?([^/]+)$/i
  );

  if (filesMatch) {
    return {
      module: normalizeModule(filesMatch[1]),
      filename: decodeURIComponent(filesMatch[2]),
      originalPath: String(fileValue),
      isDataUrl: false,
    };
  }

  const uploadsMatch = pathname.match(/^\/?uploads\/(.+)$/i);

  if (uploadsMatch) {
    const relative = uploadsMatch[1];
    const segments = relative.split('/').filter(Boolean);

    if (segments.length >= 2) {
      return {
        module: normalizeModule(segments[0]),
        filename: decodeURIComponent(segments[segments.length - 1]),
        originalPath: String(fileValue),
        isDataUrl: false,
      };
    }

    if (segments.length === 1) {
      return {
        module: normalizeModule(fallbackModule),
        filename: decodeURIComponent(segments[0]),
        originalPath: String(fileValue),
        isDataUrl: false,
      };
    }
  }

  const normalizedFilename = decodeURIComponent(
    pathname.replace(/^\/+/, '').split('/').pop() || ''
  );

  return {
    module: normalizeModule(fallbackModule),
    filename: normalizedFilename,
    originalPath: String(fileValue),
    isDataUrl: false,
  };
};

const buildFileRoute = (mode, moduleKey, fileValue) => {
  const file = extractFileReference(fileValue, moduleKey);

  if (file.isDataUrl) {
    return file.originalPath;
  }

  if (!file.filename) {
    return '';
  }

  const pathQuery = file.originalPath
    ? `?path=${encodeURIComponent(file.originalPath)}`
    : '';

  return `${getApiBaseUrl()}/files/${file.module}/${mode}/${encodeURIComponent(
    file.filename
  )}${pathQuery}`;
};

export const getFileViewUrl = (moduleKey, fileValue) =>
  buildFileRoute('view', moduleKey, fileValue);

export const getFileDownloadUrl = (moduleKey, fileValue) =>
  buildFileRoute('download', moduleKey, fileValue);
