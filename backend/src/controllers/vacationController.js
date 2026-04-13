import { vacationSchema } from '../schemas/vacationSchema.js';
import AppError from '../errors/AppError.js';
import {
  createVacationService,
  getAllVacationsService,
  getVacationsByEmployeeService,
  updateVacationService,
  deleteVacationService,
} from '../services/vacationService.js';

const normalizeVacationBody = (body) => ({
  employeeId:
    body.employeeId !== undefined && body.employeeId !== null
      ? Number(body.employeeId)
      : undefined,
  acquisitionPeriod: body.acquisitionPeriod,
  startDate: body.startDate,
  endDate: body.endDate,
  days:
    body.days !== undefined && body.days !== null
      ? Number(body.days)
      : undefined,
  status: body.status,
});

export const createVacation = async (req, res, next) => {
  try {
    const parsedBody = normalizeVacationBody(req.body);

    const validation = vacationSchema.safeParse(parsedBody);

    if (!validation.success) {
      return next(new AppError('Dados inválidos para cadastro de férias', 400));
    }

    const vacation = await createVacationService(
      validation.data,
      req.user.companyId
    );

    return res.status(201).json({
      message: 'Férias cadastradas com sucesso',
      vacation,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllVacations = async (req, res, next) => {
  try {
    const vacations = await getAllVacationsService(req.user.companyId);

    return res.status(200).json({
      message: 'Férias encontradas com sucesso',
      vacations,
    });
  } catch (error) {
    return next(error);
  }
};

export const getVacationsByEmployee = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);

    if (Number.isNaN(employeeId)) {
      return next(new AppError('ID do colaborador inválido', 400));
    }

    const vacations = await getVacationsByEmployeeService(
      employeeId,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Férias do colaborador encontradas com sucesso',
      vacations,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateVacation = async (req, res, next) => {
  try {
    const vacationId = Number(req.params.id);

    if (Number.isNaN(vacationId)) {
      return next(new AppError('ID da férias inválido', 400));
    }

    const parsedBody = normalizeVacationBody(req.body);

    const validation = vacationSchema.safeParse(parsedBody);

    if (!validation.success) {
      return next(
        new AppError('Dados inválidos para atualização de férias', 400)
      );
    }

    const vacation = await updateVacationService(
      vacationId,
      validation.data,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Férias atualizadas com sucesso',
      vacation,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteVacation = async (req, res, next) => {
  try {
    const vacationId = Number(req.params.id);

    if (Number.isNaN(vacationId)) {
      return next(new AppError('ID da férias inválido', 400));
    }

    await deleteVacationService(vacationId, req.user.companyId);

    return res.status(200).json({
      message: 'Férias excluídas com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
