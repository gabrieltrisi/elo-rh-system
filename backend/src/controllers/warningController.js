import AppError from '../errors/AppError.js';
import {
  createWarningService,
  getWarningsService,
  deleteWarningService,
} from '../services/warningService.js';

export const createWarning = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { employeeId, title, type, warningDate, status, description } =
      req.body;

    if (!employeeId || !title || !warningDate) {
      return next(new AppError('Preencha os campos obrigatórios', 400));
    }

    const warning = await createWarningService(
      {
        employeeId: Number(employeeId),
        title,
        type: type || 'Advertência verbal',
        warningDate,
        status: status || 'Registrada',
        description: description || null,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: 'Advertência cadastrada com sucesso',
      warning,
    });
  } catch (error) {
    return next(error);
  }
};

export const getWarnings = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const warnings = await getWarningsService(req.user.companyId);

    return res.status(200).json({
      message: 'Advertências encontradas com sucesso',
      warnings,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteWarning = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    await deleteWarningService(Number(id), req.user.companyId);

    return res.status(200).json({
      message: 'Advertência excluída com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
