import {
  createUniformDeliveryService,
  getAllUniformDeliveriesService,
} from '../services/uniformDeliveryService.js';

export const createUniformDelivery = async (req, res, next) => {
  try {
    const delivery = await createUniformDeliveryService(
      req.user.companyId,
      req.body
    );

    res.status(201).json({
      message: 'Entrega realizada com sucesso',
      delivery,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUniformDeliveries = async (req, res, next) => {
  try {
    const deliveries = await getAllUniformDeliveriesService(req.user.companyId);

    res.json({
      message: 'Entregas de fardamento carregadas com sucesso',
      deliveries,
    });
  } catch (error) {
    next(error);
  }
};
