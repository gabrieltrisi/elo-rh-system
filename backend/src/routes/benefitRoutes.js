import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createOrUpdateBenefit,
  getBenefits,
  deleteBenefit,
} from '../controllers/benefitController.js';

const router = express.Router();

router.post('/', authMiddleware, createOrUpdateBenefit);
router.get('/', authMiddleware, getBenefits);
router.delete('/:id', authMiddleware, deleteBenefit);

export default router;
