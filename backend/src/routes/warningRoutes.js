import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createWarning,
  getWarnings,
  deleteWarning,
} from '../controllers/warningController.js';

const router = express.Router();

router.post('/', authMiddleware, createWarning);
router.get('/', authMiddleware, getWarnings);
router.delete('/:id', authMiddleware, deleteWarning);

export default router;
