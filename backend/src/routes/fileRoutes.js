import express from 'express';
import { downloadFile, getFile, viewFile } from '../controllers/fileController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('documents.read'));

router.get('/:module/:filename', getFile);
router.get('/:module/view/:filename', viewFile);
router.get('/:module/download/:filename', downloadFile);

export default router;
