import { Router } from 'express';
import { bootstrap, register, login } from '../controllers/authController.js';

const router = Router();

// 🔥 ROTAS AUTH
router.post('/bootstrap', bootstrap);
router.post('/register', register);
router.post('/login', login);

export default router;
