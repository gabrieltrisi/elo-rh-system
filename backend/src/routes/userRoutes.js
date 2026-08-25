import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  assignProfilesToUser,
  clearUserTemporaryLock,
  createUser,
  getAllUsers,
  getUserById,
  getUserSecuritySnapshot,
  linkEmployeeToUser,
  resetUserPassword,
  updateUser,
  updateUserMfaRequirement,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('users.read'), getAllUsers);
router.get('/:id', requirePermission('users.read'), getUserById);
router.get(
  '/:id/security',
  requirePermission('users.read', 'users.security.read'),
  getUserSecuritySnapshot
);
router.post('/', requirePermission('users.create'), createUser);
router.put('/:id', requirePermission('users.update'), updateUser);
router.patch('/:id/status', requirePermission('users.status'), updateUserStatus);
router.patch('/:id/reset-password', requirePermission('users.reset_password'), resetUserPassword);
router.patch('/:id/role', requirePermission('users.update'), updateUserRole);
router.patch('/:id/link-employee', requirePermission('users.update'), linkEmployeeToUser);
router.patch('/:id/profiles', requirePermission('users.assign_profiles'), assignProfilesToUser);
router.patch(
  '/:id/security/mfa',
  requirePermission('security.manage', 'security.mfa.manage'),
  updateUserMfaRequirement
);
router.patch(
  '/:id/security/unlock',
  requirePermission('security.manage', 'security.sessions.manage'),
  clearUserTemporaryLock
);

export default router;
