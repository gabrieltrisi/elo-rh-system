import AppError from '../errors/AppError.js';
import { createAuditLog } from '../services/auditService.js';

const allowedTypes = new Set(['PROBLEMA', 'MELHORIA', 'DUVIDA', 'GO_LIVE']);
const allowedPriorities = new Set(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']);

const normalizeOption = (value, fallback, allowedValues) => {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase();

  return allowedValues.has(normalized) ? normalized : fallback;
};

const severityByPriority = {
  BAIXA: 'INFO',
  MEDIA: 'INFO',
  ALTA: 'WARNING',
  CRITICA: 'CRITICAL',
};

export const createFeedback = async (req, res, next) => {
  try {
    const type = normalizeOption(req.body?.type, 'MELHORIA', allowedTypes);
    const priority = normalizeOption(
      req.body?.priority,
      'MEDIA',
      allowedPriorities
    );
    const message = String(req.body?.message || '').trim();
    const context = String(req.body?.context || '').trim();
    const page = String(req.body?.page || '').trim();
    const requestPath = String(req.body?.path || '').trim();

    if (message.length < 8) {
      throw new AppError('Descreva o feedback com mais contexto', 400);
    }

    await createAuditLog({
      req,
      module: 'go_live',
      entityType: 'internal_feedback',
      entityId: page || requestPath || null,
      action: 'CREATE',
      severity: severityByPriority[priority] || 'INFO',
      summary: `Feedback interno registrado: ${type}`,
      details: {
        type,
        priority,
        message,
        context,
        page,
        path: requestPath,
      },
    });

    return res.status(201).json({
      message: 'Feedback registrado com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
