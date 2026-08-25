import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { buildEmployeeAccessWhere } from '../utils/employeeCompanyAccess.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const suspensionSelect = {
  id: true,
  employeeId: true,
  companyId: true,
  title: true,
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
    where: buildEmployeeAccessWhere(employeeId, companyId),
    select: employeeSelect,
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  return employee;
};

const ensureSuspensionBelongsToCompany = async (suspensionId, companyId) => {
  const suspension = await prisma.suspension.findFirst({
    where: {
      id: Number(suspensionId),
      companyId: Number(companyId),
    },
    select: suspensionSelect,
  });

  if (!suspension) {
    throw new AppError('Suspensão não encontrada', 404);
  }

  return suspension;
};

export const createSuspensionService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  return await prisma.suspension.create({
    data: {
      employeeId: Number(data.employeeId),
      companyId: Number(companyId),
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status || 'Registrada',
      description: data.description || null,
    },
    select: suspensionSelect,
  });
};

export const getSuspensionsService = async (companyId) => {
  return await prisma.suspension.findMany({
    where: {
      companyId: Number(companyId),
    },
    select: suspensionSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deleteSuspensionService = async (suspensionId, companyId) => {
  await ensureSuspensionBelongsToCompany(suspensionId, companyId);

  await prisma.suspension.delete({
    where: {
      id: Number(suspensionId),
    },
  });
};
