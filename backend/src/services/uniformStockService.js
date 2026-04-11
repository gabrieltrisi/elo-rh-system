import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

export const createUniformStockService = async (data) => {
  const exists = await prisma.uniformStock.findFirst({
    where: {
      sector: data.sector,
      itemType: data.itemType,
      color: data.color,
      size: data.size,
    },
  });

  if (exists) {
    throw new AppError('Esse fardamento já existe no estoque', 400);
  }

  return await prisma.uniformStock.create({
    data: {
      sector: data.sector,
      itemType: data.itemType,
      color: data.color,
      size: data.size,
      totalQuantity: data.totalQuantity,
      availableQuantity: data.totalQuantity,
      notes: data.notes,
    },
  });
};

export const getAllUniformStockService = async () => {
  const stock = await prisma.uniformStock.findMany({
    orderBy: { id: 'asc' },
  });

  return stock.map((item) => ({
    ...item,
    isLowStock: item.availableQuantity <= 2,
  }));
};
