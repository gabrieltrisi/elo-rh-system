import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

export const createUniformService = async (data) => {
  const employeeId = Number(data.employeeId);

  const employeeExists = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employeeExists) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return await prisma.uniformControl.create({
    data: {
      employeeId,
      size: data.size,
      quantity: Number(data.quantity),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      notes: data.notes,
    },
  });
};

export const getAllUniformsService = async () => {
  return await prisma.uniformControl.findMany({
    include: {
      employee: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
};

export const getUniformsByEmployeeService = async (employeeId) => {
  const id = Number(employeeId);

  const employeeExists = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employeeExists) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return await prisma.uniformControl.findMany({
    where: {
      employeeId: id,
    },
    include: {
      employee: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
};
