import express from 'express';
import upload from '../config/multer.js';
import {
  create,
  list,
  updateStatus,
} from '../controllers/certificateController.js';

const router = express.Router();

router.post('/', upload.single('file'), create);
router.get('/', list);
router.put('/:id/status', updateStatus);

export default router;
