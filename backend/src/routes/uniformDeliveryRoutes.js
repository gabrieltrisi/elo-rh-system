import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createUniformDelivery,
  getAllUniformDeliveries,
} from '../controllers/uniformDeliveryController.js';

const router = Router();

router.post('/', authMiddleware, requirePermission('uniforms.update'), createUniformDelivery);
router.get('/', authMiddleware, requirePermission('uniforms.read'), getAllUniformDeliveries);

export default router;
