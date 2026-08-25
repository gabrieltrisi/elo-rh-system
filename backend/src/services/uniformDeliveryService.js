import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import {
  buildEmployeeAccessWhere,
  buildEmployeeRelationCompanyWhere,
} from '../utils/employeeCompanyAccess.js';

export const createUniformDeliveryService = async (companyId, data) => {
  const employeeId = Number(data.employeeId);
  const uniformStockId = Number(data.uniformStockId);
  const quantity = Number(data.quantity);

  if (!companyId) {
    throw new AppError('Empresa não identificada', 401);
  }

  const employee = await prisma.employee.findFirst({
    where: buildEmployeeAccessWhere(employeeId, companyId),
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  const stock = await prisma.uniformStock.findFirst({
    where: { id: uniformStockId, companyId },
  });

  if (!stock) {
    throw new AppError('Estoque não encontrado', 404);
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError('Quantidade deve ser maior que zero', 400);
  }

  if (stock.availableQuantity < quantity) {
    throw new AppError('Estoque insuficiente', 400);
  }

  return prisma.$transaction(async (tx) => {
    const delivery = await tx.uniformDelivery.create({
      data: {
        employeeId,
        uniformStockId,
        quantity,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        notes: data.notes || null,
      },
      include: {
        employee: true,
        uniformStock: true,
      },
    });

    await tx.uniformStock.update({
      where: { id: uniformStockId },
      data: {
        availableQuantity: stock.availableQuantity - quantity,
      },
    });

    return delivery;
  });
};

export const getAllUniformDeliveriesService = async (companyId) => {
  if (!companyId) {
    throw new AppError('Empresa não identificada', 401);
  }

  return prisma.uniformDelivery.findMany({
    where: {
      employee: buildEmployeeRelationCompanyWhere(companyId),
    },
    include: {
      employee: true,
      uniformStock: true,
    },
    orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
  });
};
