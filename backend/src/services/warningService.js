import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const warningSelect = {
  id: true,
  employeeId: true,
  companyId: true,
  title: true,
  type: true,
  warningDate: true,
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

const ensureWarningBelongsToCompany = async (warningId, companyId) => {
  const warning = await prisma.warning.findFirst({
    where: {
      id: Number(warningId),
      companyId: Number(companyId),
    },
    select: warningSelect,
  });

  if (!warning) {
    throw new AppError('Advertência não encontrada', 404);
  }

  return warning;
};

export const createWarningService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  return await prisma.warning.create({
    data: {
      employeeId: Number(data.employeeId),
      companyId: Number(companyId),
      title: data.title,
      type: data.type,
      warningDate: new Date(data.warningDate),
      status: data.status || 'Registrada',
      description: data.description || null,
    },
    select: warningSelect,
  });
};

export const getWarningsService = async (companyId) => {
  return await prisma.warning.findMany({
    where: {
      companyId: Number(companyId),
    },
    select: warningSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deleteWarningService = async (warningId, companyId) => {
  await ensureWarningBelongsToCompany(warningId, companyId);

  await prisma.warning.delete({
    where: {
      id: Number(warningId),
    },
  });
};
