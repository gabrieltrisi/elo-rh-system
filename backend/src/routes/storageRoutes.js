import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  getStorageIntegrationSettings,
  upsertStorageIntegrationSettings,
} from '../controllers/storageController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/settings', requirePermission('storage.read'), getStorageIntegrationSettings);
router.put('/settings', requirePermission('storage.manage'), upsertStorageIntegrationSettings);

export default router;
