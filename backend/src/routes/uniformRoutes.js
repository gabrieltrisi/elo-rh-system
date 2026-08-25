import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/authorization.js';
import {
  createUniform,
  getAllUniforms,
  getUniformsByEmployee,
} from '../controllers/uniformController.js';

const router = express.Router();

router.post('/', authMiddleware, requirePermission('uniforms.update'), createUniform);
router.get('/', authMiddleware, requirePermission('uniforms.read'), getAllUniforms);
router.get('/employee/:employeeId', authMiddleware, requirePermission('uniforms.read'), getUniformsByEmployee);

export default router;
