import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController.js';
import { getEmployeeHistory } from '../controllers/employeeHistoryController.js';

const router = express.Router();

// CRUD
router.post('/', authMiddleware, createEmployee);
router.get('/', authMiddleware, getAllEmployees);

// histórico
router.get('/:id/history', authMiddleware, getEmployeeHistory);

router.get('/:id', authMiddleware, getEmployeeById);
router.put('/:id', authMiddleware, updateEmployee);
router.delete('/:id', authMiddleware, deleteEmployee);

export default router;
