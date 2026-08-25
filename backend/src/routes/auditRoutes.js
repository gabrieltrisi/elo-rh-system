import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  getAuditLogById,
  getAuditLogs,
} from '../controllers/auditController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('audit.read'));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
