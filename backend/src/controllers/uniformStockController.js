import { uniformStockSchema } from '../schemas/uniformStockSchema.js';
import AppError from '../errors/AppError.js';
import {
  createUniformStockService,
  getAllUniformStockService,
} from '../services/uniformStockService.js';

export const createUniformStock = async (req, res, next) => {
  const validation = uniformStockSchema.safeParse(req.body);
  if (!validation.success) return next(new AppError('Dados inválidos', 400));

  try {
    const stock = await createUniformStockService(req.body);

    res.status(201).json({
      message: 'Estoque cadastrado com sucesso',
      stock,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUniformStock = async (req, res, next) => {
  try {
    const stock = await getAllUniformStockService();

    res.json({
      message: 'Estoque de fardamento',
      stock,
    });
  } catch (error) {
    next(error);
  }
};
