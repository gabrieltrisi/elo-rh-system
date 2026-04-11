import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = Router();

// app.use('/dashboard', dashboardRoutes)
router.get('/', authMiddleware, getDashboard);

export default router;
