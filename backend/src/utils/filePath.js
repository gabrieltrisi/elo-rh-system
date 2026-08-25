import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export const FILE_MODULES = {
  documentation: 'documents',
  documents: 'documents',
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
  payslips: 'official-pdfs',
  reports: 'official-pdfs',
  'official-pdfs': 'official-pdfs',
};

const INLINE_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.txt',
]);

const toSafePathname = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^data:/i.test(raw)) {
    return raw;
  }

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).pathname || '';
    }
  } catch {
    return raw;
  }

  return raw;
};

const hasPathTraversal = (value) => String(value || '').includes('..');

export const isDataUrl = (value) => /^data:/i.test(String(value || '').trim());

export const resolveModuleFolder = (moduleKey) => {
  const normalized = String(moduleKey || '').trim().toLowerCase();
  return FILE_MODULES[normalized] || null;
};

const ensureUploadsRoot = () => {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
};

export const buildUploadedFileUrl = (file) => {
  if (!file?.path) return null;

  const normalizedPath = String(file.path)
    .replace(/\\/g, '/')
    .replace(/^.*?uploads\//, '');

  return normalizedPath ? `/uploads/${normalizedPath}` : null;
};

const sanitizeFilename = (filename) => {
  const decoded = decodeURIComponent(String(filename || '').trim());

  if (!decoded || hasPathTraversal(decoded)) {
    return null;
  }

  const basename = path.basename(decoded);
  return basename === decoded ? basename : null;
};

const extractRelativeUploadPath = (value) => {
  const pathname = toSafePathname(value);

  if (!pathname || isDataUrl(pathname)) {
    return null;
  }

  const normalized = pathname
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^uploads\/?/i, '');

  if (!normalized || hasPathTraversal(normalized)) {
    return null;
  }

  return normalized;
};

const ensurePathInsideUploads = (absolutePath) => {
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(UPLOADS_ROOT, resolved);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
};

const fileExists = (absolutePath) => {
  try {
    return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  } catch {
    return false;
  }
};

const resolveFromStoredPath = (storedPath) => {
  const relativePath = extractRelativeUploadPath(storedPath);

  if (!relativePath) return null;

  const absolutePath = path.resolve(UPLOADS_ROOT, relativePath);

  if (!ensurePathInsideUploads(absolutePath) || !fileExists(absolutePath)) {
    return null;
  }

  const segments = relativePath.split('/').filter(Boolean);
  const folderName = segments.length > 1 ? segments[0] : '';

  return {
    absolutePath,
    relativePath,
    folderName,
    filename: path.basename(absolutePath),
  };
};

const searchLegacyFilename = (filename, preferredFolder) => {
  const safeFilename = sanitizeFilename(filename);

  if (!safeFilename) return null;

  const folderCandidates = [
    preferredFolder,
    ...new Set(Object.values(FILE_MODULES)),
  ].filter(Boolean);

  for (const folder of folderCandidates) {
    const absolutePath = path.resolve(UPLOADS_ROOT, folder, safeFilename);

    if (ensurePathInsideUploads(absolutePath) && fileExists(absolutePath)) {
      return {
        absolutePath,
        relativePath: path.join(folder, safeFilename).replace(/\\/g, '/'),
        folderName: folder,
        filename: safeFilename,
      };
    }
  }

  const rootAbsolutePath = path.resolve(UPLOADS_ROOT, safeFilename);

  if (
    ensurePathInsideUploads(rootAbsolutePath) &&
    fileExists(rootAbsolutePath)
  ) {
    return {
      absolutePath: rootAbsolutePath,
      relativePath: safeFilename,
      folderName: '',
      filename: safeFilename,
    };
  }

  return null;
};

export const resolveFileReference = ({
  moduleKey,
  filename,
  storedPath,
} = {}) => {
  ensureUploadsRoot();

  const preferredFolder = resolveModuleFolder(moduleKey);
  const resolvedFromPath = resolveFromStoredPath(storedPath);

  if (resolvedFromPath) {
    return {
      ...resolvedFromPath,
      moduleFolder: resolvedFromPath.folderName || preferredFolder || '',
      canInline: INLINE_EXTENSIONS.has(
        path.extname(resolvedFromPath.filename).toLowerCase()
      ),
    };
  }

  const safeFilename = sanitizeFilename(filename);

  if (!safeFilename) {
    return null;
  }

  const resolvedFromFilename = searchLegacyFilename(safeFilename, preferredFolder);

  if (!resolvedFromFilename) {
    return null;
  }

  return {
    ...resolvedFromFilename,
    moduleFolder: resolvedFromFilename.folderName || preferredFolder || '',
    canInline: INLINE_EXTENSIONS.has(
      path.extname(resolvedFromFilename.filename).toLowerCase()
    ),
  };
};
