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

router.use(authMiddleware);

router.get('/', getAllVacations);
router.get('/employee/:employeeId', getVacationsByEmployee);
router.post('/', createVacation);
router.put('/:id', updateVacation);
router.delete('/:id', deleteVacation);

export default router;
