import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createOnboarding,
  getOnboardings,
  getOnboardingByEmployee,
  updateOnboarding,
} from '../controllers/onboardingController.js';

const router = express.Router();

router.post('/', authMiddleware, createOnboarding);
router.get('/', authMiddleware, getOnboardings);
router.get('/employee/:employeeId', authMiddleware, getOnboardingByEmployee);
router.put('/:id', authMiddleware, updateOnboarding);

export default router;
