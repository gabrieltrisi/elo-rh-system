import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import { getAllCompanies } from '../controllers/companyController.js';

const router = express.Router();

router.get('/', authMiddleware, requirePermission('settings.company'), getAllCompanies);

export default router;
