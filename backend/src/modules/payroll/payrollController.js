import AppError from '../../errors/AppError.js';
import {
  getTimePayrollSyncPreviewService,
  syncTimeToPayrollRunService,
} from './timeToPayrollService.js';
import {
  closePayrollRunService,
  createPayrollEventService,
  createPayrollMovementService,
  createPayrollRunService,
  deletePayrollMovementService,
  duplicatePayrollEventService,
  getPayrollChargesService,
  getPayrollEventByIdService,
  getPayrollEventsService,
  getPayrollPayslipPreviewService,
  getPayrollPayslipsService,
  getPayrollRunByIdService,
  getPayrollRunChargesService,
  getPayrollRunEmployeesService,
  getPayrollRunPayslipsService,
  getPayrollRunsService,
  processPayrollRunService,
  reopenPayrollRunService,
  updatePayrollEventService,
  updatePayrollEventStatusService,
  updatePayrollMovementService,
} from './payrollService.js';
import { createAuditLog } from '../../services/auditService.js';

export const getPayrollRuns = async (req, res, next) => {
  try {
    const result = await getPayrollRunsService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Competencias carregadas com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollRunById = async (req, res, next) => {
  try {
    const runId = Number(req.params.id);

    if (Number.isNaN(runId)) {
      return next(new AppError('ID da competencia invalido', 400));
    }

    const run = await getPayrollRunByIdService(runId, req.user.companyId);

    return res.status(200).json({
      message: 'Competencia carregada com sucesso',
      run,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPayrollRun = async (req, res, next) => {
  try {
    const run = await createPayrollRunService(
      req.body,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_run',
      entityId: run.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: `Competencia ${run.referenceLabel || `${run.month}/${run.year}`} aberta`,
      after: run,
    });

    return res.status(201).json({
      message: 'Competencia aberta com sucesso',
      run,
    });
  } catch (error) {
    return next(error);
  }
};

export const processPayrollRun = async (req, res, next) => {
  try {
    const run = await processPayrollRunService(
      req.params.id,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_run',
      entityId: run.id,
      action: 'PROCESS',
      severity: 'CRITICAL',
      summary: `Competencia ${run.referenceLabel || `${run.month}/${run.year}`} processada`,
      after: run,
    });

    return res.status(200).json({
      message: 'Competencia processada com sucesso',
      run,
    });
  } catch (error) {
    return next(error);
  }
};

export const closePayrollRun = async (req, res, next) => {
  try {
    const run = await closePayrollRunService(
      req.params.id,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_run',
      entityId: run.id,
      action: 'CLOSE',
      severity: 'CRITICAL',
      summary: `Competencia ${run.referenceLabel || `${run.month}/${run.year}`} fechada`,
      after: run,
    });

    return res.status(200).json({
      message: 'Competencia fechada com sucesso',
      run,
    });
  } catch (error) {
    return next(error);
  }
};

export const reopenPayrollRun = async (req, res, next) => {
  try {
    const run = await reopenPayrollRunService(
      req.params.id,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_run',
      entityId: run.id,
      action: 'REOPEN',
      severity: 'CRITICAL',
      summary: `Competencia ${run.referenceLabel || `${run.month}/${run.year}`} reaberta`,
      after: run,
    });

    return res.status(200).json({
      message: 'Competencia reaberta com sucesso',
      run,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollRunEmployees = async (req, res, next) => {
  try {
    const employees = await getPayrollRunEmployeesService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Colaboradores da competencia carregados com sucesso',
      employees,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollTimeSyncPreview = async (req, res, next) => {
  try {
    const preview = await getTimePayrollSyncPreviewService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Previa de integracao Jornada -> Folha carregada com sucesso',
      preview,
    });
  } catch (error) {
    return next(error);
  }
};

export const syncPayrollRunFromTime = async (req, res, next) => {
  try {
    const result = await syncTimeToPayrollRunService({
      runId: req.params.id,
      companyId: req.user.companyId,
      userId: req.user.userId,
      req,
    });

    return res.status(200).json({
      message: 'Jornada sincronizada com a competencia da folha com sucesso',
      result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollEvents = async (req, res, next) => {
  try {
    const result = await getPayrollEventsService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Eventos da folha carregados com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollEventById = async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);

    if (Number.isNaN(eventId)) {
      return next(new AppError('ID do evento invalido', 400));
    }

    const eventRecord = await getPayrollEventByIdService(
      eventId,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Evento carregado com sucesso',
      event: eventRecord,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPayrollEvent = async (req, res, next) => {
  try {
    const eventRecord = await createPayrollEventService(
      req.body,
      req.user.companyId
    );

    await createAuditLog({
      req,
      module: 'payroll_events',
      entityType: 'payroll_event',
      entityId: eventRecord.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: `Evento da folha "${eventRecord.name}" criado`,
      after: eventRecord,
    });

    return res.status(201).json({
      message: 'Evento criado com sucesso',
      event: eventRecord,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePayrollEvent = async (req, res, next) => {
  try {
    const eventRecord = await updatePayrollEventService(
      req.params.id,
      req.body,
      req.user.companyId
    );

    await createAuditLog({
      req,
      module: 'payroll_events',
      entityType: 'payroll_event',
      entityId: eventRecord.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: `Evento da folha "${eventRecord.name}" atualizado`,
      after: eventRecord,
    });

    return res.status(200).json({
      message: 'Evento atualizado com sucesso',
      event: eventRecord,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePayrollEventStatus = async (req, res, next) => {
  try {
    const eventRecord = await updatePayrollEventStatusService(
      req.params.id,
      req.body,
      req.user.companyId
    );

    await createAuditLog({
      req,
      module: 'payroll_events',
      entityType: 'payroll_event',
      entityId: eventRecord.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: `Status do evento "${eventRecord.name}" atualizado`,
      after: eventRecord,
    });

    return res.status(200).json({
      message: 'Status do evento atualizado com sucesso',
      event: eventRecord,
    });
  } catch (error) {
    return next(error);
  }
};

export const duplicatePayrollEvent = async (req, res, next) => {
  try {
    const eventRecord = await duplicatePayrollEventService(
      req.params.id,
      req.user.companyId
    );

    await createAuditLog({
      req,
      module: 'payroll_events',
      entityType: 'payroll_event',
      entityId: eventRecord.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: `Evento da folha "${eventRecord.name}" duplicado`,
      after: eventRecord,
    });

    return res.status(201).json({
      message: 'Evento duplicado com sucesso',
      event: eventRecord,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPayrollMovement = async (req, res, next) => {
  try {
    const movement = await createPayrollMovementService(
      req.params.id,
      req.body,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_movement',
      entityId: movement.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: 'Lancamento criado na competencia da folha',
      after: movement,
    });

    return res.status(201).json({
      message: 'Lancamento criado com sucesso',
      movement,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePayrollMovement = async (req, res, next) => {
  try {
    const movement = await updatePayrollMovementService(
      req.params.id,
      req.body,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_movement',
      entityId: movement.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: 'Lancamento da folha atualizado',
      after: movement,
    });

    return res.status(200).json({
      message: 'Lancamento atualizado com sucesso',
      movement,
    });
  } catch (error) {
    return next(error);
  }
};

export const deletePayrollMovement = async (req, res, next) => {
  try {
    const movement = await deletePayrollMovementService(
      req.params.id,
      req.user.companyId,
      req.user.userId
    );

    await createAuditLog({
      req,
      module: 'payroll',
      entityType: 'payroll_movement',
      entityId: movement.id,
      action: 'SOFT_DELETE',
      severity: 'CRITICAL',
      summary: 'Lancamento da folha inativado',
      after: movement,
    });

    return res.status(200).json({
      message: 'Lancamento inativado com sucesso',
      movement,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollPayslips = async (req, res, next) => {
  try {
    const result = await getPayrollPayslipsService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Holerites carregados com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollRunPayslips = async (req, res, next) => {
  try {
    const payslips = await getPayrollRunPayslipsService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Previews de holerite carregados com sucesso',
      payslips,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollPayslipPreview = async (req, res, next) => {
  try {
    const payslip = await getPayrollPayslipPreviewService(
      req.params.id,
      req.params.employeeId,
      req.user.companyId
    );

    await createAuditLog({
      req,
      module: 'payslips',
      entityType: 'payslip_preview',
      entityId: `${req.params.id}:${req.params.employeeId}`,
      action: 'VIEW',
      severity: 'INFO',
      summary: `Preview de holerite visualizado para ${payslip.employee?.name || 'colaborador'}`,
      details: {
        runId: req.params.id,
        employeeId: req.params.employeeId,
      },
    });

    return res.status(200).json({
      message: 'Preview do holerite carregado com sucesso',
      payslip,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollCharges = async (req, res, next) => {
  try {
    const result = await getPayrollChargesService(req.user.companyId, req.query);

    return res.status(200).json({
      message: 'Encargos carregados com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollRunCharges = async (req, res, next) => {
  try {
    const charges = await getPayrollRunChargesService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Encargos da competencia carregados com sucesso',
      charges,
    });
  } catch (error) {
    return next(error);
  }
};
