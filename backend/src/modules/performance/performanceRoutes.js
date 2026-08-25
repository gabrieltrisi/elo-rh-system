import express from 'express';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';
import {
  createPerformanceEvaluation,
  createPerformanceExternalFeedback,
  createPerformancePeerFeedback,
  getPerformanceDashboard,
  getPerformanceOptions,
} from './performanceController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('performance.read'), getPerformanceDashboard);
router.get('/options', requirePermission('performance.read'), getPerformanceOptions);
router.post(
  '/evaluations',
  requirePermission('performance.evaluate'),
  createPerformanceEvaluation
);
router.post(
  '/peer-feedback',
  requirePermission('performance.feedback'),
  createPerformancePeerFeedback
);
router.post(
  '/external-feedback',
  requirePermission('performance.external_feedback'),
  createPerformanceExternalFeedback
);

export default router;
