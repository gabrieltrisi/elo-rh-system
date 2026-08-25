import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  addWorkScheduleAssignment,
  createWorkSchedule,
  deleteWorkSchedule,
  deleteWorkScheduleAssignment,
  duplicateWorkSchedule,
  getAllWorkSchedules,
  getWorkScheduleById,
  getWorkScheduleOptions,
  getWorkSchedulesByEmployee,
  updateWorkSchedule,
  updateWorkScheduleAssignment,
  updateWorkScheduleStatus,
} from '../controllers/workScheduleController.js';

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/options',
  requirePermission('work_schedules.read'),
  getWorkScheduleOptions
);
router.get(
  '/employee/:employeeId',
  requirePermission('work_schedules.read'),
  getWorkSchedulesByEmployee
);
router.get('/', requirePermission('work_schedules.read'), getAllWorkSchedules);
router.get('/:id', requirePermission('work_schedules.read'), getWorkScheduleById);
router.post(
  '/',
  requirePermission('work_schedules.create'),
  createWorkSchedule
);
router.put(
  '/:id',
  requirePermission('work_schedules.update'),
  updateWorkSchedule
);
router.patch(
  '/:id/status',
  requirePermission('work_schedules.publish', 'work_schedules.cancel'),
  updateWorkScheduleStatus
);
router.post(
  '/:id/assignments',
  requirePermission('work_schedules.assign'),
  addWorkScheduleAssignment
);
router.put(
  '/:id/assignments/:assignmentId',
  requirePermission('work_schedules.assign'),
  updateWorkScheduleAssignment
);
router.delete(
  '/:id/assignments/:assignmentId',
  requirePermission('work_schedules.assign'),
  deleteWorkScheduleAssignment
);
router.post(
  '/:id/duplicate',
  requirePermission('work_schedules.create'),
  duplicateWorkSchedule
);
router.delete(
  '/:id',
  requirePermission('work_schedules.cancel'),
  deleteWorkSchedule
);

export default router;
