import express from 'express';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';
import upload from '../../config/multer.js';
import {
  createTraining,
  deleteTraining,
  downloadTrainingAttachment,
  getAllTrainings,
  openCertificatePermalink,
  updateTraining,
  viewTrainingAttachment,
} from './trainingController.js';

const router = express.Router();

router.get('/certificates/:permalink', openCertificatePermalink);
router.get('/', authMiddleware, requirePermission('trainings.read'), getAllTrainings);
router.post('/', authMiddleware, requirePermission('trainings.create'), upload.single('certificate'), createTraining);
router.put('/:id', authMiddleware, requirePermission('trainings.update'), upload.single('certificate'), updateTraining);
router.delete('/:id', authMiddleware, requirePermission('trainings.update'), deleteTraining);
router.get(
  '/:id/attachment/view',
  authMiddleware,
  requirePermission('trainings.files.read'),
  viewTrainingAttachment
);
router.get(
  '/:id/attachment/download',
  authMiddleware,
  requirePermission('trainings.files.read'),
  downloadTrainingAttachment
);

export default router;
