import AppError from '../errors/AppError.js';
import {
  createLeaveService,
  getLeavesService,
  deleteLeaveService,
} from '../services/leaveService.js';

export const createLeave = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { employeeId, type, startDate, endDate, status, description } =
      req.body;

    if (!employeeId || !startDate || !endDate) {
      return next(new AppError('Preencha os campos obrigatórios', 400));
    }

    const leave = await createLeaveService(
      {
        employeeId: Number(employeeId),
        type: type || 'INSS',
        startDate,
        endDate,
        status: status || 'Ativo',
        description: description || null,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: 'Afastamento cadastrado com sucesso',
      leave,
    });
  } catch (error) {
    return next(error);
  }
};

export const getLeaves = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const leaves = await getLeavesService(req.user.companyId);

    return res.status(200).json({
      message: 'Afastamentos encontrados com sucesso',
      leaves,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteLeave = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    await deleteLeaveService(Number(id), req.user.companyId);

    return res.status(200).json({
      message: 'Afastamento excluído com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
