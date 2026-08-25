import express from 'express';
import { createFeedback } from '../controllers/feedbackController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createFeedback);

export default router;
