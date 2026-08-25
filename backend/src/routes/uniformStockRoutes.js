import { Router } from 'express';
import {
  createUniformStock,
  getAllUniformStock,
} from '../controllers/uniformStockController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';

const router = Router();

router.post('/', authMiddleware, requirePermission('uniforms.update'), createUniformStock);
router.get('/', authMiddleware, requirePermission('uniforms.read'), getAllUniformStock);

export default router;
