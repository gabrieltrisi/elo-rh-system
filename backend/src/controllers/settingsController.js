import {
  createCompanyUnitService,
  getSettingsDashboardService,
  updateCompanySettingsService,
  updateCompanyUnitService,
  updateCompanyUnitStatusService,
  updateSettingsSectionService,
} from '../services/settingsService.js';
import AppError from '../errors/AppError.js';
import { hasPermission } from '../middlewares/authorization.js';

const SECTION_PERMISSIONS = {
  payroll: 'settings.payroll',
  security: 'settings.security',
  notifications: 'settings.notifications',
  performance: 'settings.performance',
};

export const getSettingsDashboard = async (req, res, next) => {
  try {
    const settings = await getSettingsDashboardService(req.user.companyId);

    return res.status(200).json({
      message: 'Configuracoes carregadas com sucesso',
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCompanySettings = async (req, res, next) => {
  try {
    const company = await updateCompanySettingsService({
      companyId: req.user.companyId,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(200).json({
      message: 'Configuracoes institucionais atualizadas com sucesso',
      section: 'company',
      data: company,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSettingsSection = async (req, res, next) => {
  try {
    const requiredPermission = SECTION_PERMISSIONS[req.params.section];

    if (requiredPermission && !hasPermission(req.user, requiredPermission)) {
      throw new AppError('Acesso negado para atualizar esta secao', 403);
    }

    const data = await updateSettingsSectionService({
      companyId: req.user.companyId,
      namespace: req.params.section,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(200).json({
      message: `Configuracoes da secao ${req.params.section} atualizadas com sucesso`,
      section: req.params.section,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const createCompanyUnit = async (req, res, next) => {
  try {
    const unit = await createCompanyUnitService({
      companyId: req.user.companyId,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      message: 'Unidade criada com sucesso',
      unit,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCompanyUnit = async (req, res, next) => {
  try {
    const unit = await updateCompanyUnitService({
      companyId: req.user.companyId,
      unitId: req.params.id,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(200).json({
      message: 'Unidade atualizada com sucesso',
      unit,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCompanyUnitStatus = async (req, res, next) => {
  try {
    const unit = await updateCompanyUnitStatusService({
      companyId: req.user.companyId,
      unitId: req.params.id,
      status: req.body?.status,
      user: req.user,
      req,
    });

    return res.status(200).json({
      message: 'Status da unidade atualizado com sucesso',
      unit,
    });
  } catch (error) {
    return next(error);
  }
};
