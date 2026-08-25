import AppError from '../errors/AppError.js';
import { resolveFileReference, resolveModuleFolder } from '../utils/filePath.js';

export const getFileStreamPayload = ({
  moduleKey,
  filename,
  storedPath,
  forceDownload = false,
} = {}) => {
  const resolvedModule = resolveModuleFolder(moduleKey);

  if (!resolvedModule) {
    throw new AppError('Módulo de arquivo inválido', 400);
  }

  const file = resolveFileReference({
    moduleKey,
    filename,
    storedPath,
  });

  if (!file) {
    throw new AppError('Arquivo não encontrado', 404);
  }

  return {
    absolutePath: file.absolutePath,
    filename: file.filename,
    disposition: forceDownload || !file.canInline ? 'attachment' : 'inline',
  };
};
