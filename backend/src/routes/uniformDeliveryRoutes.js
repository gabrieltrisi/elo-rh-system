import { Router } from 'express';
import { createUniformDelivery } from '../controllers/uniformDeliveryController.js';

const router = Router();

router.post('/uniform-delivery', createUniformDelivery);

export default router;
