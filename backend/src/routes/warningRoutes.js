import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createWarning,
  getWarnings,
  deleteWarning,
} from '../controllers/warningController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('warnings.create'), createWarning);
router.get('/', authMiddleware, requirePermission('warnings.read'), getWarnings);
router.delete('/:id', authMiddleware, requirePermission('warnings.update'), deleteWarning);

export default router;
