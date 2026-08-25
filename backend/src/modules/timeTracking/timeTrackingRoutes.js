import express from 'express';
import multer from 'multer';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';
import {
  confirmTimeImportBatch,
  createTimeImportPreview,
  getBankHours,
  getTimeImportBatchById,
  getTimeImportBatches,
  getTimeSummary,
  getTimeTrackingOptions,
  resolveTimeEntryEmployee,
} from './timeTrackingController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.use(authMiddleware);

router.get('/imports', requirePermission('time.read'), getTimeImportBatches);
router.get('/imports/:id', requirePermission('time.read'), getTimeImportBatchById);
router.post(
  '/import',
  requirePermission('time.import'),
  upload.single('file'),
  createTimeImportPreview
);
router.post(
  '/imports/:id/confirm',
  requirePermission('time.review'),
  confirmTimeImportBatch
);
router.patch(
  '/imports/:batchId/entries/:entryId/resolve',
  requirePermission('time.review'),
  resolveTimeEntryEmployee
);
router.get('/summary', requirePermission('time.read'), getTimeSummary);
router.get(
  '/bank-hours',
  requirePermission('time.bank_hours.read'),
  getBankHours
);
router.get('/options', requirePermission('time.read'), getTimeTrackingOptions);

export default router;
