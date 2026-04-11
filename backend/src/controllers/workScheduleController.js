import { workScheduleSchema } from '../schemas/workScheduleSchema.js';
import AppError from '../errors/AppError.js';
import {
  createWorkScheduleService,
  getAllWorkSchedulesService,
  getWorkScheduleByEmployeeService,
  updateWorkScheduleService,
  deleteWorkScheduleService,
} from '../services/workScheduleService.js';

export const createWorkSchedule = async (req, res, next) => {
  const validation = workScheduleSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const schedule = await createWorkScheduleService(
      validation.data,
      req.user.companyId
    );

    res.status(201).json({
      message: 'Escala cadastrada com sucesso',
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllWorkSchedules = async (req, res, next) => {
  try {
    const schedules = await getAllWorkSchedulesService(req.user.companyId);

    res.json({
      message: 'Escalas encontradas com sucesso',
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkSchedulesByEmployee = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const schedules = await getWorkScheduleByEmployeeService(
      employeeId,
      req.user.companyId
    );

    res.json({
      message: 'Escalas do colaborador encontradas com sucesso',
      schedules,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkSchedule = async (req, res, next) => {
  const validation = workScheduleSchema.safeParse(req.body);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const id = Number(req.params.id);
    const schedule = await updateWorkScheduleService(
      id,
      validation.data,
      req.user.companyId
    );

    res.json({
      message: 'Escala atualizada com sucesso',
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkSchedule = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await deleteWorkScheduleService(id, req.user.companyId);

    res.json({
      message: 'Escala removida com sucesso',
    });
  } catch (error) {
    next(error);
  }
};
