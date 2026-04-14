import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const leaveSelect = {
  id: true,
  employeeId: true,
  companyId: true,
  type: true,
  startDate: true,
  endDate: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: employeeSelect,
  },
};

const ensureEmployeeBelongsToCompany = async (employeeId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: Number(employeeId),
      companyId: Number(companyId),
    },
    select: employeeSelect,
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  return employee;
};

const ensureLeaveBelongsToCompany = async (leaveId, companyId) => {
  const leave = await prisma.employeeLeave.findFirst({
    where: {
      id: Number(leaveId),
      companyId: Number(companyId),
    },
    select: leaveSelect,
  });

  if (!leave) {
    throw new AppError('Afastamento não encontrado', 404);
  }

  return leave;
};

export const createLeaveService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  return await prisma.employeeLeave.create({
    data: {
      employeeId: Number(data.employeeId),
      companyId: Number(companyId),
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status || 'Ativo',
      description: data.description || null,
    },
    select: leaveSelect,
  });
};

export const getLeavesService = async (companyId) => {
  return await prisma.employeeLeave.findMany({
    where: {
      companyId: Number(companyId),
    },
    select: leaveSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deleteLeaveService = async (leaveId, companyId) => {
  await ensureLeaveBelongsToCompany(leaveId, companyId);

  await prisma.employeeLeave.delete({
    where: {
      id: Number(leaveId),
    },
  });
};
