import { createUniformDeliveryService } from '../services/uniformDeliveryService.js';

export const createUniformDelivery = async (req, res, next) => {
  try {
    const delivery = await createUniformDeliveryService(req.body);

    res.status(201).json({
      message: 'Entrega realizada com sucesso',
      delivery,
    });
  } catch (error) {
    next(error);
  }
};
