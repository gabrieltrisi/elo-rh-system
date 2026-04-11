import { vacationSchema } from '../schemas/vacationSchema.js';
import AppError from '../errors/AppError.js';
import {
  createVacationService,
  getAllVacationsService,
  getVacationsByEmployeeService,
  updateVacationService,
  deleteVacationService,
} from '../services/vacationService.js';

export const createVacation = async (req, res, next) => {
  const parsedBody = {
    ...req.body,
    employeeId: Number(req.body.employeeId),
    days: Number(req.body.days),
  };

  const validation = vacationSchema.safeParse(parsedBody);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const vacation = await createVacationService(
      parsedBody,
      req.user.companyId
    );

    res.status(201).json({
      message: 'Férias cadastradas com sucesso',
      vacation,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllVacations = async (req, res, next) => {
  try {
    const vacations = await getAllVacationsService(req.user.companyId);

    res.json({
      message: 'Férias encontradas com sucesso',
      vacations,
    });
  } catch (error) {
    next(error);
  }
};

export const getVacationsByEmployee = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const vacations = await getVacationsByEmployeeService(
      employeeId,
      req.user.companyId
    );

    res.json({
      message: 'Férias do colaborador encontradas com sucesso',
      vacations,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVacation = async (req, res, next) => {
  const parsedBody = {
    ...req.body,
    employeeId: Number(req.body.employeeId),
    days: Number(req.body.days),
  };

  const validation = vacationSchema.safeParse(parsedBody);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const vacationId = Number(req.params.id);
    const vacation = await updateVacationService(
      vacationId,
      parsedBody,
      req.user.companyId
    );

    res.json({
      message: 'Férias atualizadas com sucesso',
      vacation,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVacation = async (req, res, next) => {
  try {
    const vacationId = Number(req.params.id);
    await deleteVacationService(vacationId, req.user.companyId);

    res.json({
      message: 'Férias excluídas com sucesso',
    });
  } catch (error) {
    next(error);
  }
};
