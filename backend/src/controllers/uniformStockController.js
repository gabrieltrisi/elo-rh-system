import { uniformStockSchema } from '../schemas/uniformStockSchema.js';
import AppError from '../errors/AppError.js';
import {
  createUniformStockService,
  getAllUniformStockService,
} from '../services/uniformStockService.js';

export const createUniformStock = async (req, res, next) => {
  const parsedBody = {
    sector: req.body?.sector,
    itemType: req.body?.itemName || req.body?.itemType || req.body?.type,
    color: req.body?.color || '',
    size: req.body?.size,
    totalQuantity: Number(
      req.body?.availableQuantity ?? req.body?.totalQuantity ?? req.body?.quantity
    ),
    notes: req.body?.notes,
  };

  const validation = uniformStockSchema.safeParse(parsedBody);

  if (!validation.success) {
    return next(new AppError('Dados inválidos', 400));
  }

  try {
    const stock = await createUniformStockService(req.user.companyId, {
      sector: parsedBody.sector,
      itemType: parsedBody.itemType,
      color: parsedBody.color,
      size: parsedBody.size,
      totalQuantity: parsedBody.totalQuantity,
      minimumQuantity: Number(req.body?.minimumQuantity ?? 0),
      notes: parsedBody.notes,
    });

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
    const stock = await getAllUniformStockService(req.user.companyId);

    res.json({
      message: 'Estoque de fardamento',
      stock,
    });
  } catch (error) {
    next(error);
  }
};
