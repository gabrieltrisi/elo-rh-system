import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { authorizeRoles, requirePermission } from '../middlewares/authorization.js';
import {
  assignPermissionsToProfile,
  createProfile,
  duplicateProfile,
  getAllPermissions,
  getAllProfiles,
  getProfileById,
  updateProfile,
  updateProfileStatus,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles('SUPER_ADMIN', 'ADMIN'));

router.get('/', requirePermission('profiles.read'), getAllProfiles);
router.get('/permissions/catalog', requirePermission('permissions.read'), getAllPermissions);
router.get('/:id', requirePermission('profiles.read'), getProfileById);
router.post('/', requirePermission('profiles.create'), createProfile);
router.put('/:id', requirePermission('profiles.update'), updateProfile);
router.post('/:id/duplicate', requirePermission('profiles.create'), duplicateProfile);
router.patch('/:id/status', requirePermission('profiles.update'), updateProfileStatus);
router.patch('/:id/permissions', requirePermission('profiles.assign'), assignPermissionsToProfile);

export default router;
