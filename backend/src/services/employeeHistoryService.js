import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

export const getEmployeeHistoryService = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
    include: {
      vacations: {
        orderBy: { createdAt: 'desc' },
      },
      uniformDeliveries: {
        include: {
          uniformStock: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      certificates: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return employee;
};
