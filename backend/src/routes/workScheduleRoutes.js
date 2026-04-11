import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createWorkSchedule,
  getAllWorkSchedules,
  getWorkSchedulesByEmployee,
  updateWorkSchedule,
  deleteWorkSchedule,
} from '../controllers/workScheduleController.js';

const router = express.Router();

router.post('/', authMiddleware, createWorkSchedule);
router.get('/', authMiddleware, getAllWorkSchedules);
router.get('/employee/:employeeId', authMiddleware, getWorkSchedulesByEmployee);
router.put('/:id', authMiddleware, updateWorkSchedule);
router.delete('/:id', authMiddleware, deleteWorkSchedule);

export default router;
