import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

export const createUniformDeliveryService = async (data) => {
  const employeeId = Number(data.employeeId);
  const uniformStockId = Number(data.uniformStockId);
  const quantity = Number(data.quantity);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  const stock = await prisma.uniformStock.findUnique({
    where: { id: uniformStockId },
  });

  if (!stock) {
    throw new AppError('Estoque não encontrado', 404);
  }

  if (quantity <= 0) {
    throw new AppError('Quantidade deve ser maior que zero', 400);
  }

  if (stock.availableQuantity < quantity) {
    throw new AppError('Estoque insuficiente', 400);
  }

  const delivery = await prisma.uniformDelivery.create({
    data: {
      employeeId,
      uniformStockId,
      quantity,
      deliveryDate: new Date(),
      notes: data.notes,
    },
  });

  await prisma.uniformStock.update({
    where: { id: uniformStockId },
    data: {
      availableQuantity: stock.availableQuantity - quantity,
    },
  });

  return delivery;
};
