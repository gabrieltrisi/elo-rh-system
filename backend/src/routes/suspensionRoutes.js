import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createSuspension,
  getSuspensions,
  deleteSuspension,
} from '../controllers/suspensionController.js';

const router = express.Router();

router.post('/', authMiddleware, createSuspension);
router.get('/', authMiddleware, getSuspensions);
router.delete('/:id', authMiddleware, deleteSuspension);

export default router;
