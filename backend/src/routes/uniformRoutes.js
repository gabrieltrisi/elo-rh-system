import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createUniform,
  getAllUniforms,
  getUniformsByEmployee,
} from '../controllers/uniformController.js';

const router = express.Router();

router.post('/', authMiddleware, createUniform);
router.get('/', authMiddleware, getAllUniforms);
router.get('/employee/:employeeId', authMiddleware, getUniformsByEmployee);

export default router;
