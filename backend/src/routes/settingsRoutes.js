import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createCompanyUnit,
  getSettingsDashboard,
  updateCompanySettings,
  updateCompanyUnit,
  updateCompanyUnitStatus,
  updateSettingsSection,
} from '../controllers/settingsController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('settings.read'), getSettingsDashboard);
router.put(
  '/company',
  requirePermission('settings.update', 'settings.company'),
  updateCompanySettings
);
router.put(
  '/sections/:section',
  requirePermission('settings.update'),
  updateSettingsSection
);
router.post(
  '/units',
  requirePermission('settings.update', 'settings.company'),
  createCompanyUnit
);
router.put(
  '/units/:id',
  requirePermission('settings.update', 'settings.company'),
  updateCompanyUnit
);
router.patch(
  '/units/:id/status',
  requirePermission('settings.update', 'settings.company'),
  updateCompanyUnitStatus
);

export default router;
