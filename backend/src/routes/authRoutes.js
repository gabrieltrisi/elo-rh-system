import { Router } from 'express';
import {
  bootstrapAdmin,
  register,
  login,
} from '../controllers/authController.js';

const router = Router();

// 🔥 ROTAS AUTH
router.post('/bootstrap', bootstrapAdmin);
router.post('/register', register);
router.post('/login', login);

export default router;
