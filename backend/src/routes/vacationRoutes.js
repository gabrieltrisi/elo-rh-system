import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createVacation,
  getAllVacations,
  getVacationsByEmployee,
  updateVacation,
  deleteVacation,
} from '../controllers/vacationController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('vacations.read'), getAllVacations);
router.get('/employee/:employeeId', requirePermission('vacations.read'), getVacationsByEmployee);
router.post('/', requirePermission('vacations.create'), createVacation);
router.put('/:id', requirePermission('vacations.create'), updateVacation);
router.delete('/:id', requirePermission('vacations.create'), deleteVacation);

export default router;
