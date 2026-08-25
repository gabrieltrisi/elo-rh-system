import { getAllCompaniesService } from '../services/companyService.js';

export const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await getAllCompaniesService();

    res.json({
      message: 'Empresas carregadas com sucesso',
      companies,
    });
  } catch (error) {
    next(error);
  }
};
