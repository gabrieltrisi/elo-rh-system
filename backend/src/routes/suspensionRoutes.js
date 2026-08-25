import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createSuspension,
  getSuspensions,
  deleteSuspension,
} from '../controllers/suspensionController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('suspensions.create'), createSuspension);
router.get('/', authMiddleware, requirePermission('suspensions.read'), getSuspensions);
router.delete('/:id', authMiddleware, requirePermission('suspensions.create'), deleteSuspension);

export default router;
