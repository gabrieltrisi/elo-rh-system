import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const normalizeString = (value) => String(value || '').trim();

export const createUniformStockService = async (companyId, data) => {
  const sector = normalizeString(data.sector);
  const itemName = normalizeString(data.itemName || data.itemType);
  const color = normalizeString(data.color);
  const size = normalizeString(data.size);
  const quantity = Number(
    data.availableQuantity ?? data.totalQuantity ?? data.quantity ?? 0
  );
  const minimumQuantity = Number(data.minimumQuantity ?? 0);
  const notes = normalizeString(data.notes);

  if (!companyId) {
    throw new AppError('Empresa não identificada', 401);
  }

  if (!sector || !itemName || !size) {
    throw new AppError('Setor, tipo e tamanho são obrigatórios', 400);
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError('Quantidade inválida', 400);
  }

  const existingItem = await prisma.uniformStock.findFirst({
    where: {
      companyId,
      sector,
      itemName,
      color: color || null,
      size,
    },
  });

  if (existingItem) {
    return prisma.uniformStock.update({
      where: { id: existingItem.id },
      data: {
        availableQuantity: existingItem.availableQuantity + quantity,
        minimumQuantity:
          minimumQuantity > 0 ? minimumQuantity : existingItem.minimumQuantity,
        notes: notes || existingItem.notes,
      },
    });
  }

  return prisma.uniformStock.create({
    data: {
      companyId,
      sector,
      itemName,
      color: color || null,
      size,
      availableQuantity: quantity,
      minimumQuantity,
      notes: notes || null,
    },
  });
};

export const getAllUniformStockService = async (companyId) => {
  if (!companyId) {
    throw new AppError('Empresa não identificada', 401);
  }

  const stock = await prisma.uniformStock.findMany({
    where: {
      companyId,
    },
    orderBy: [{ sector: 'asc' }, { itemName: 'asc' }, { size: 'asc' }],
  });

  return stock.map((item) => {
    const minimumQuantity = Number(item.minimumQuantity || 0);
    const alertThreshold = minimumQuantity > 0 ? minimumQuantity : 2;

    return {
      ...item,
      isLowStock: Number(item.availableQuantity || 0) <= alertThreshold,
    };
  });
};
