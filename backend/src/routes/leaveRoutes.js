import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createLeave,
  getLeaves,
  deleteLeave,
} from '../controllers/leaveController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('leave.create'), createLeave);
router.get('/', authMiddleware, requirePermission('leave.read'), getLeaves);
router.delete('/:id', authMiddleware, requirePermission('leave.create'), deleteLeave);

export default router;
