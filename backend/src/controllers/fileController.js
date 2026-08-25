import { getFileStreamPayload } from '../services/fileService.js';
import { createAuditLog } from '../services/auditService.js';

const streamFile = (forceDownload = false, action = 'VIEW') => {
  return async (req, res, next) => {
    try {
      const payload = getFileStreamPayload({
        moduleKey: req.params.module,
        filename: req.params.filename,
        storedPath: req.query.path,
        forceDownload,
      });

      res.type(payload.absolutePath);
      res.setHeader(
        'Content-Disposition',
        `${payload.disposition}; filename="${encodeURIComponent(
          payload.filename
        )}"`
      );

      await createAuditLog({
        req,
        module: req.params.module,
        entityType: 'file',
        entityId: payload.filename,
        action,
        severity: 'INFO',
        summary:
          action === 'EXPORT'
            ? `Arquivo "${payload.filename}" baixado pelo sistema`
            : `Arquivo "${payload.filename}" visualizado pelo sistema`,
        details: {
          module: req.params.module,
          filename: payload.filename,
          disposition: payload.disposition,
          storedPath: req.query.path || null,
        },
      });

      return res.sendFile(payload.absolutePath);
    } catch (error) {
      return next(error);
    }
  };
};

export const getFile = streamFile(false, 'VIEW');
export const viewFile = streamFile(false, 'VIEW');
export const downloadFile = streamFile(true, 'EXPORT');
