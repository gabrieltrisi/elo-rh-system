import AppError from '../errors/AppError.js';
import {
  createSuspensionService,
  getSuspensionsService,
  deleteSuspensionService,
} from '../services/suspensionService.js';

export const createSuspension = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { employeeId, title, startDate, endDate, status, description } =
      req.body;

    if (!employeeId || !title || !startDate) {
      return next(new AppError('Preencha os campos obrigatórios', 400));
    }

    const suspension = await createSuspensionService(
      {
        employeeId: Number(employeeId),
        title,
        startDate,
        endDate: endDate || null,
        status: status || 'Registrada',
        description: description || null,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: 'Suspensão cadastrada com sucesso',
      suspension,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSuspensions = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const suspensions = await getSuspensionsService(req.user.companyId);

    return res.status(200).json({
      message: 'Suspensões encontradas com sucesso',
      suspensions,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteSuspension = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    await deleteSuspensionService(Number(id), req.user.companyId);

    return res.status(200).json({
      message: 'Suspensão excluída com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
