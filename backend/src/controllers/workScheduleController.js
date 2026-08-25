import AppError from '../errors/AppError.js';
import { createAuditLog } from '../services/auditService.js';
import {
  workScheduleAssignmentSchema,
  workScheduleQuerySchema,
  workScheduleSchema,
  workScheduleStatusSchema,
} from '../schemas/workScheduleSchema.js';
import {
  addWorkScheduleAssignmentService,
  createWorkScheduleService,
  deleteWorkScheduleAssignmentService,
  deleteWorkScheduleService,
  duplicateWorkScheduleService,
  getAllWorkSchedulesService,
  getWorkScheduleByEmployeeService,
  getWorkScheduleByIdService,
  getWorkScheduleOptionsService,
  updateWorkScheduleAssignmentService,
  updateWorkScheduleService,
  updateWorkScheduleStatusService,
} from '../services/workScheduleService.js';

const countScheduleConflicts = (schedule) =>
  (schedule?.assignments || []).reduce(
    (total, assignment) =>
      total + (Array.isArray(assignment.conflicts) ? assignment.conflicts.length : 0),
    0
  );

export const getWorkScheduleOptions = async (req, res, next) => {
  try {
    const options = await getWorkScheduleOptionsService(req.user.companyId);

    return res.status(200).json(options);
  } catch (error) {
    return next(error);
  }
};

export const createWorkSchedule = async (req, res, next) => {
  const validation = workScheduleSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados invalidos para criar a escala', 400));
  }

  try {
    const schedule = await createWorkScheduleService(
      validation.data,
      req.user.companyId,
      req.user
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule',
      entityId: schedule.id,
      action: 'CREATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Escala ${schedule.name} criada com ${schedule.assignmentsCount} colaborador(es) escalado(s).`,
      after: schedule,
      details: {
        conflictsDetected: countScheduleConflicts(schedule),
        scheduleType: schedule.scheduleType,
        status: schedule.status,
      },
    });

    return res.status(201).json({
      message: 'Escala criada com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllWorkSchedules = async (req, res, next) => {
  const validation = workScheduleQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return next(new AppError('Filtros invalidos para consultar escalas', 400));
  }

  try {
    const payload = await getAllWorkSchedulesService(
      validation.data,
      req.user.companyId
    );

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const getWorkScheduleById = async (req, res, next) => {
  try {
    const schedule = await getWorkScheduleByIdService(
      req.params.id,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Escala carregada com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const getWorkSchedulesByEmployee = async (req, res, next) => {
  try {
    const schedules = await getWorkScheduleByEmployeeService(
      req.params.employeeId,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Escalas do colaborador carregadas com sucesso',
      schedules,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateWorkSchedule = async (req, res, next) => {
  const validation = workScheduleSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados invalidos para atualizar a escala', 400));
  }

  try {
    const { before, schedule } = await updateWorkScheduleService(
      req.params.id,
      validation.data,
      req.user.companyId
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule',
      entityId: schedule.id,
      action: 'UPDATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Escala ${schedule.name} atualizada.`,
      before,
      after: schedule,
      details: {
        conflictsDetected: countScheduleConflicts(schedule),
      },
    });

    return res.status(200).json({
      message: 'Escala atualizada com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateWorkScheduleStatus = async (req, res, next) => {
  const validation = workScheduleStatusSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Status invalido para a escala', 400));
  }

  try {
    const { before, schedule } = await updateWorkScheduleStatusService(
      req.params.id,
      validation.data.status,
      req.user.companyId
    );

    const actionByStatus = {
      PUBLICADA: 'PUBLISH',
      CANCELADA: 'CANCEL',
      CONCLUIDA: 'CLOSE',
      RASCUNHO: 'UPDATE',
    };

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule',
      entityId: schedule.id,
      action: actionByStatus[schedule.status] || 'UPDATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Escala ${schedule.name} alterada para ${schedule.status}.`,
      before,
      after: schedule,
    });

    return res.status(200).json({
      message: 'Status da escala atualizado com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const addWorkScheduleAssignment = async (req, res, next) => {
  const validation = workScheduleAssignmentSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados invalidos para adicionar colaborador', 400));
  }

  try {
    const { before, schedule } = await addWorkScheduleAssignmentService(
      req.params.id,
      validation.data,
      req.user.companyId
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule_assignment',
      entityId: schedule.id,
      action: 'CREATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Colaborador adicionado a escala ${schedule.name}.`,
      before,
      after: schedule,
    });

    return res.status(201).json({
      message: 'Colaborador escalado com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateWorkScheduleAssignment = async (req, res, next) => {
  const validation = workScheduleAssignmentSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados invalidos para atualizar colaborador escalado', 400));
  }

  try {
    const { before, schedule } = await updateWorkScheduleAssignmentService(
      req.params.id,
      req.params.assignmentId,
      validation.data,
      req.user.companyId
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule_assignment',
      entityId: req.params.assignmentId,
      action: 'UPDATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Horario individual atualizado na escala ${schedule.name}.`,
      before,
      after: schedule,
    });

    return res.status(200).json({
      message: 'Colaborador escalado atualizado com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteWorkScheduleAssignment = async (req, res, next) => {
  try {
    const { before, schedule } = await deleteWorkScheduleAssignmentService(
      req.params.id,
      req.params.assignmentId,
      req.user.companyId
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule_assignment',
      entityId: req.params.assignmentId,
      action: 'DELETE',
      severity: 'INFO',
      summary: `Colaborador removido da escala ${schedule.name}.`,
      before,
      after: schedule,
    });

    return res.status(200).json({
      message: 'Colaborador removido da escala com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const duplicateWorkSchedule = async (req, res, next) => {
  try {
    const { before, schedule } = await duplicateWorkScheduleService(
      req.params.id,
      req.user.companyId,
      req.user
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule',
      entityId: schedule.id,
      action: 'CREATE',
      severity: schedule.hasConflicts ? 'WARNING' : 'INFO',
      summary: `Escala ${before.name} duplicada para ${schedule.name}.`,
      before,
      after: schedule,
    });

    return res.status(201).json({
      message: 'Escala duplicada com sucesso',
      schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteWorkSchedule = async (req, res, next) => {
  try {
    const { before } = await deleteWorkScheduleService(
      req.params.id,
      req.user.companyId
    );

    await createAuditLog({
      req,
      user: req.user,
      module: 'work_schedules',
      entityType: 'work_schedule',
      entityId: req.params.id,
      action: 'DELETE',
      severity: 'WARNING',
      summary: `Escala ${before.name} cancelada e arquivada.`,
      before,
    });

    return res.status(200).json({
      message: 'Escala arquivada com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
