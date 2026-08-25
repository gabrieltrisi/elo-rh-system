import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import authMiddleware from '../../middlewares/authMiddleware.js';
import { requirePermission } from '../../middlewares/authorization.js';

import {
  createAdmissionForm,
  getAllAdmissionForms,
  getAdmissionFormByToken,
  submitAdmissionForm,
  sendAdmissionInvite,
  startOnboardingFromAdmission,
} from './admissionController.js';

const router = express.Router();

/*
========================================
UPLOADS PRÉ-ADMISSÃO
========================================
*/

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

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, //10MB por arquivo
  },
});

/*
========================================
ROTAS PRIVADAS (RH)
========================================
*/

/*
Criar pré-cadastro + gerar pré-admissão

Body:
{
 fullName,
 email,
 phone,
 desiredPosition,
 contractType,
 expiresAt,
 notes
}
*/
router.post('/', authMiddleware, requirePermission('preadmission.create'), createAdmissionForm);

/*
Listar pré-admissões
*/
router.get('/', authMiddleware, requirePermission('preadmission.read'), getAllAdmissionForms);

/*
Disparar convite
*/
router.post('/:id/send', authMiddleware, requirePermission('preadmission.update'), sendAdmissionInvite);

/*
Aprovar candidato e iniciar onboarding
*/
router.post(
  '/:id/start-onboarding',
  authMiddleware,
  requirePermission('preadmission.update'),
  startOnboardingFromAdmission
);

/*
========================================
ROTAS PÚBLICAS (CANDIDATO)
========================================
*/

/*
Carregar formulário via token
*/
router.get('/public/:token', getAdmissionFormByToken);

/*
Enviar formulário preenchido + documentos
*/
router.post('/public/:token', upload.any(), submitAdmissionForm);

export default router;
