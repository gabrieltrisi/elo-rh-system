import AppError from '../../errors/AppError.js';
import { createAuditLog } from '../../services/auditService.js';
import {
  confirmTimeImportBatchService,
  createTimeImportPreviewService,
  getBankHoursService,
  getTimeImportBatchByIdService,
  getTimeImportBatchesService,
  getTimeSummaryService,
  getTimeTrackingOptionsService,
  resolveTimeEntryEmployeeService,
} from './timeTrackingService.js';

export const createTimeImportPreview = async (req, res, next) => {
  try {
    const batch = await createTimeImportPreviewService({
      file: req.file,
      companyId: req.user.companyId,
      importedByUserId: req.user.userId,
      source: req.body.source || 'MANUAL',
      notes: req.body.notes,
    });

    await createAuditLog({
      req,
      module: 'time',
      entityType: 'time_import_batch',
      entityId: batch.id,
      action: 'UPLOAD',
      severity: 'WARNING',
      summary: `Previa de importacao de jornada criada para ${batch.originalName}`,
      after: {
        id: batch.id,
        originalName: batch.originalName,
        source: batch.source,
        totalRows: batch.totalRows,
      },
    });

    return res.status(201).json({
      message: 'Previa da importacao gerada com sucesso',
      batch,
    });
  } catch (error) {
    return next(error);
  }
};

export const confirmTimeImportBatch = async (req, res, next) => {
  try {
    const batch = await confirmTimeImportBatchService(
      req.params.id,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'time',
      entityType: 'time_import_batch',
      entityId: batch.id,
      action: 'PROCESS',
      severity: 'CRITICAL',
      summary: `Importacao de jornada confirmada para ${batch.originalName}`,
      after: {
        id: batch.id,
        status: batch.status,
        totalRows: batch.totalRows,
        validRows: batch.validRows,
      },
    });

    return res.status(200).json({
      message: 'Importacao confirmada e consolidada com sucesso',
      batch,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTimeImportBatches = async (req, res, next) => {
  try {
    const result = await getTimeImportBatchesService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Historico de importacoes carregado com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTimeImportBatchById = async (req, res, next) => {
  try {
    const batch = await getTimeImportBatchByIdService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Detalhe da importacao carregado com sucesso',
      batch,
    });
  } catch (error) {
    return next(error);
  }
};

export const resolveTimeEntryEmployee = async (req, res, next) => {
  try {
    if (!req.body.employeeId) {
      throw new AppError('Informe o colaborador para vinculo', 400);
    }

    const entry = await resolveTimeEntryEmployeeService({
      batchId: req.params.batchId,
      entryId: req.params.entryId,
      employeeId: req.body.employeeId,
      companyId: req.user.companyId,
    });

    await createAuditLog({
      req,
      module: 'time',
      entityType: 'time_entry',
      entityId: entry.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: 'Pendencia de vinculo da jornada resolvida manualmente',
      after: {
        employeeId: entry.employeeId,
        validationStatus: entry.validationStatus,
      },
    });

    return res.status(200).json({
      message: 'Vinculo atualizado com sucesso',
      entry,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTimeSummary = async (req, res, next) => {
  try {
    const result = await getTimeSummaryService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Folha de ponto consolidada carregada com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getBankHours = async (req, res, next) => {
  try {
    const result = await getBankHoursService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Banco de horas carregado com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTimeTrackingOptions = async (req, res, next) => {
  try {
    const options = await getTimeTrackingOptionsService(req.user.companyId);

    return res.status(200).json({
      message: 'Opcoes da jornada carregadas com sucesso',
      ...options,
    });
  } catch (error) {
    return next(error);
  }
};
