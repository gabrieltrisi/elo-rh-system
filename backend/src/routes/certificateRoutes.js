import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../config/multer.js';
import {
  create,
  list,
  updateStatus,
  remove,
} from '../controllers/certificateController.js';

const router = express.Router();

router.post('/', authMiddleware, upload.single('file'), create);
router.get('/', authMiddleware, list);
router.put('/:id/status', authMiddleware, updateStatus);
router.delete('/:id', authMiddleware, remove);

export default router;
