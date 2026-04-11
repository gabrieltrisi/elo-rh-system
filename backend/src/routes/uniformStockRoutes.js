import { Router } from 'express';
import {
  createUniformStock,
  getAllUniformStock,
} from '../controllers/uniformStockController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/uniform-stock', authMiddleware, createUniformStock);
router.get('/uniform-stock', authMiddleware, getAllUniformStock);

export default router;
