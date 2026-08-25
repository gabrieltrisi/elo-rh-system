import {
  getIntegrationByProviderService,
  listIntegrationLogsService,
  listIntegrationOverviewService,
  testIntegrationConnectionService,
  triggerIntegrationSyncService,
  upsertIntegrationConnectionService,
} from '../services/integrationService.js';

export const getIntegrationsOverview = async (req, res, next) => {
  try {
    const data = await listIntegrationOverviewService(req.user);

    return res.status(200).json({
      message: 'Hub de integracoes carregado com sucesso',
      ...data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getIntegrationByProvider = async (req, res, next) => {
  try {
    const integration = await getIntegrationByProviderService(
      req.params.provider,
      req.user
    );

    return res.status(200).json({
      message: 'Integracao carregada com sucesso',
      integration,
    });
  } catch (error) {
    return next(error);
  }
};

export const upsertIntegrationConnection = async (req, res, next) => {
  try {
    const integration = await upsertIntegrationConnectionService(
      req.params.provider,
      req.body,
      req.user,
      req
    );

    return res.status(200).json({
      message: 'Integracao atualizada com sucesso',
      integration,
    });
  } catch (error) {
    return next(error);
  }
};

export const testIntegrationConnection = async (req, res, next) => {
  try {
    const data = await testIntegrationConnectionService(
      req.params.provider,
      req.user,
      req
    );

    return res.status(200).json({
      message: 'Teste de conexao executado com sucesso',
      ...data,
    });
  } catch (error) {
    return next(error);
  }
};

export const syncIntegrationConnection = async (req, res, next) => {
  try {
    const data = await triggerIntegrationSyncService(
      req.params.provider,
      req.user,
      req
    );

    return res.status(200).json({
      message: 'Sincronizacao registrada com sucesso',
      ...data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getIntegrationLogs = async (req, res, next) => {
  try {
    const logs = await listIntegrationLogsService(req.query, req.user);

    return res.status(200).json({
      message: 'Logs de integracao carregados com sucesso',
      logs,
    });
  } catch (error) {
    return next(error);
  }
};
