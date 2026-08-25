import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
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
router.post('/', authMiddleware, requirePermission('employees.create'), createEmployee);
router.get('/', authMiddleware, requirePermission('employees.read'), getAllEmployees);

// histórico
router.get('/:id/history', authMiddleware, requirePermission('employees.read'), getEmployeeHistory);

router.get('/:id', authMiddleware, requirePermission('employees.read'), getEmployeeById);
router.put('/:id', authMiddleware, requirePermission('employees.update'), updateEmployee);
router.delete('/:id', authMiddleware, requirePermission('employees.delete'), deleteEmployee);

export default router;
