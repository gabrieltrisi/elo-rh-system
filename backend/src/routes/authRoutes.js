import { Router } from 'express';
import {
  bootstrapAdmin,
  disableMfa,
  forgotPassword,
  getSessions,
  login,
  logout,
  reauthenticate,
  register,
  revokeAllSessions,
  revokeSession,
  resetPassword,
  setupMfa,
  verifyMfa,
} from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// 🔥 ROTAS AUTH
router.post('/bootstrap', bootstrapAdmin);
router.post('/register', register);
router.post('/login', login);
router.post('/mfa/verify', verifyMfa);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.use(authMiddleware);

router.post('/mfa/setup', setupMfa);
router.post('/mfa/disable', disableMfa);
router.post('/logout', logout);
router.get('/sessions', getSessions);
router.post('/sessions/:id/revoke', revokeSession);
router.post('/sessions/revoke-all', revokeAllSessions);
router.post('/reauthenticate', reauthenticate);

export default router;
