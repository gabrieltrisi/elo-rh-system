import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createOnboarding,
  getOnboardings,
  updateOnboarding,
  sendWelcomeOnboarding,
  generateAccessTemplate,
} from '../controllers/onboardingController.js';

const router = express.Router();

router.post('/', authMiddleware, createOnboarding);
router.get('/', authMiddleware, getOnboardings);
router.put('/:id', authMiddleware, updateOnboarding);

router.post('/:id/send-welcome', authMiddleware, sendWelcomeOnboarding);
router.get('/:id/access-template', authMiddleware, generateAccessTemplate);

export default router;
