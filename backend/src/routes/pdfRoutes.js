import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  generatePerformanceEvaluationPdf,
  downloadOfficialPdf,
  generatePayslipPdf,
  generateSuspensionPdf,
  generateWarningPdf,
  viewOfficialPdf,
} from '../controllers/pdfController.js';

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/payslips/:runId/:employeeId',
  requirePermission('payroll.payslip.read', 'payroll.payslip.export'),
  generatePayslipPdf
);

router.post(
  '/warnings/:id',
  requirePermission('warnings.read'),
  generateWarningPdf
);

router.post(
  '/suspensions/:id',
  requirePermission('suspensions.read'),
  generateSuspensionPdf
);

router.post(
  '/performance/:employeeId',
  requirePermission('performance.read', 'performance.export'),
  generatePerformanceEvaluationPdf
);

router.get(
  '/storage/:storageObjectId/view',
  viewOfficialPdf
);

router.get(
  '/storage/:storageObjectId/download',
  downloadOfficialPdf
);

export default router;
