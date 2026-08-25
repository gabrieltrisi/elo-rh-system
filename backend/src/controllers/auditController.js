import AppError from '../errors/AppError.js';
import {
  getAuditLogByIdService,
  getAuditLogsService,
} from '../services/auditService.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await getAuditLogsService(req.query, req.user);

    return res.status(200).json({
      message: 'Eventos de auditoria carregados com sucesso',
      logs: result.logs,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await getAuditLogByIdService(req.params.id, req.user);

    if (!log) {
      throw new AppError('Evento de auditoria nao encontrado', 404);
    }

    return res.status(200).json({
      message: 'Evento de auditoria carregado com sucesso',
      log,
    });
  } catch (error) {
    return next(error);
  }
};
