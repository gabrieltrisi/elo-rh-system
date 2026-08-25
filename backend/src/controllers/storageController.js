import {
  getStorageIntegrationSettingsService,
  upsertStorageIntegrationSettingsService,
} from '../services/storageIntegrationService.js';

export const getStorageIntegrationSettings = async (req, res, next) => {
  try {
    const settings = await getStorageIntegrationSettingsService(req.user.companyId);

    return res.status(200).json({
      message: 'Configuracao de storage carregada com sucesso',
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

export const upsertStorageIntegrationSettings = async (req, res, next) => {
  try {
    const settings = await upsertStorageIntegrationSettingsService(
      req.user.companyId,
      req.body
    );

    return res.status(200).json({
      message: 'Configuracao de storage atualizada com sucesso',
      settings,
    });
  } catch (error) {
    return next(error);
  }
};
