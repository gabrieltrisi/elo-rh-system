import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  exportReportExcelController,
  exportReportPdfController,
  getReportOptionsController,
  getReportPreviewController,
} from '../controllers/reportController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/options', requirePermission('reports.read'), getReportOptionsController);
router.get('/preview', requirePermission('reports.read'), getReportPreviewController);
router.get(
  '/export/excel',
  requirePermission('reports.read', 'reports.export_excel'),
  exportReportExcelController
);
router.get(
  '/export/pdf',
  requirePermission('reports.read', 'reports.export_pdf'),
  exportReportPdfController
);

export default router;
