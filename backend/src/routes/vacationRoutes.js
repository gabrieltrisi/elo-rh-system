import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createVacation,
  getAllVacations,
  getVacationsByEmployee,
  updateVacation,
  deleteVacation,
} from '../controllers/vacationController.js';

const router = express.Router();

router.post('/', authMiddleware, createVacation);
router.get('/', authMiddleware, getAllVacations);
router.get('/employee/:employeeId', authMiddleware, getVacationsByEmployee);
router.put('/:id', authMiddleware, updateVacation);
router.delete('/:id', authMiddleware, deleteVacation);

export default router;
