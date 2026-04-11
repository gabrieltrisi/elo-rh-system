import { getDashboardService } from '../services/dashboardService.js';

export const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await getDashboardService(req.user.companyId);

    res.json({
      message: 'Resumo do dashboard',
      dashboard,
    });
  } catch (error) {
    next(error);
  }
};
