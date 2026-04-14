import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createLeave,
  getLeaves,
  deleteLeave,
} from '../controllers/leaveController.js';

const router = express.Router();

router.post('/', authMiddleware, createLeave);
router.get('/', authMiddleware, getLeaves);
router.delete('/:id', authMiddleware, deleteLeave);

export default router;
