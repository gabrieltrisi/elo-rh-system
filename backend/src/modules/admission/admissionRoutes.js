import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMiddleware from '../../middlewares/authMiddleware.js';
import {
  createAdmissionForm,
  getAllAdmissionForms,
  getAdmissionFormByToken,
  submitAdmissionForm,
} from './admissionController.js';

const router = express.Router();

const baseUploadDir = path.resolve('uploads/admission');

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, baseUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.post('/', authMiddleware, createAdmissionForm);
router.get('/', authMiddleware, getAllAdmissionForms);

router.get('/public/:token', getAdmissionFormByToken);
router.post('/public/:token', upload.any(), submitAdmissionForm);

export default router;
