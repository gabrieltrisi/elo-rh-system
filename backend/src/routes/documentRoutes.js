import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../config/multer.js';
import {
  createDocument,
  getAllDocuments,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

router.post('/', authMiddleware, upload.single('file'), createDocument);
router.get('/', authMiddleware, getAllDocuments);
router.delete('/:id', authMiddleware, deleteDocument);

export default router;
