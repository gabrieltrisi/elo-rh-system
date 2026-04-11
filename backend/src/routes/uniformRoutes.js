import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createUniform,
  getAllUniforms,
  getUniformsByEmployee,
} from '../controllers/uniformController.js';

const router = express.Router();

router.post('/uniforms', authMiddleware, createUniform);
router.get('/uniforms', authMiddleware, getAllUniforms);
router.get(
  '/uniforms/employee/:employeeId',
  authMiddleware,
  getUniformsByEmployee
);

export default router;
