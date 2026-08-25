import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createOrUpdateBenefit,
  getBenefits,
  deleteBenefit,
} from '../controllers/benefitController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('benefits.update'), createOrUpdateBenefit);
router.get('/', authMiddleware, requirePermission('benefits.read'), getBenefits);
router.delete('/:id', authMiddleware, requirePermission('benefits.update'), deleteBenefit);

export default router;
