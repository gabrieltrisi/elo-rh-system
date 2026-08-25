import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import upload from '../config/multer.js';
import {
  createDocument,
  getAllDocuments,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('documents.create'), upload.single('file'), createDocument);
router.get('/', authMiddleware, requirePermission('documents.read'), getAllDocuments);
router.delete('/:id', authMiddleware, requirePermission('documents.delete'), deleteDocument);

export default router;
