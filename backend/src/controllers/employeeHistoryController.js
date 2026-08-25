import { getEmployeeHistoryService } from '../services/employeeHistoryService.js';

export const getEmployeeHistory = async (req, res, next) => {
  try {
    const employee = await getEmployeeHistoryService(
      req.user.companyId,
      req.params.id,
      req.query.scope
    );

    res.json({
      message: 'Histórico do colaborador carregado com sucesso',
      employee,
    });
  } catch (error) {
    next(error);
  }
};
