import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  getIntegrationByProvider,
  getIntegrationLogs,
  getIntegrationsOverview,
  syncIntegrationConnection,
  testIntegrationConnection,
  upsertIntegrationConnection,
} from '../controllers/integrationController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('integrations.read'), getIntegrationsOverview);
router.get(
  '/logs',
  requirePermission('integrations.read', 'integrations.logs.read'),
  getIntegrationLogs
);
router.get(
  '/:provider',
  requirePermission('integrations.read'),
  getIntegrationByProvider
);
router.put(
  '/:provider',
  requirePermission('integrations.manage', 'integrations.update'),
  upsertIntegrationConnection
);
router.post(
  '/:provider/test',
  requirePermission('integrations.manage', 'integrations.update'),
  testIntegrationConnection
);
router.post(
  '/:provider/sync',
  requirePermission('integrations.manage', 'integrations.sync'),
  syncIntegrationConnection
);

export default router;
