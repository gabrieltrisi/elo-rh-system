import express from 'express';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';
import upload from '../../config/multer.js';
import {
  createCandidate,
  deleteCandidate,
  listCandidates,
  updateCandidate,
} from './recruitmentController.js';

const router = express.Router();

router.get('/candidates', authMiddleware, requirePermission('recruitment.read'), listCandidates);
router.post('/candidates', authMiddleware, requirePermission('recruitment.create'), upload.single('resume'), createCandidate);
router.put('/candidates/:id', authMiddleware, requirePermission('recruitment.update'), upload.single('resume'), updateCandidate);
router.delete('/candidates/:id', authMiddleware, requirePermission('recruitment.update'), deleteCandidate);

export default router;
