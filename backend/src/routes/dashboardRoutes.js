import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = Router();

// app.use('/dashboard', dashboardRoutes)
router.get('/', authMiddleware, requirePermission('dashboard.read'), getDashboard);

export default router;
