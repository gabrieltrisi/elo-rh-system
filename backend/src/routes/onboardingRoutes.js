import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createOnboarding,
  getOnboardings,
  getOnboardingByEmployee,
  updateOnboarding,
  sendWelcomeOnboarding,
  generateAccessTemplate,
} from '../controllers/onboardingController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('onboarding.update'), createOnboarding);
router.get('/', authMiddleware, requirePermission('onboarding.read'), getOnboardings);
router.get('/employee/:employeeId', authMiddleware, requirePermission('onboarding.read'), getOnboardingByEmployee);
router.put('/:id', authMiddleware, requirePermission('onboarding.update'), updateOnboarding);
router.post('/:id/send-welcome', authMiddleware, requirePermission('onboarding.update'), sendWelcomeOnboarding);
router.get('/:id/access-template', authMiddleware, requirePermission('onboarding.read'), generateAccessTemplate);

export default router;
