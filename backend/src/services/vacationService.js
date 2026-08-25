import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import {
  buildEmployeeAccessWhere,
  buildEmployeeRelationCompanyWhere,
} from '../utils/employeeCompanyAccess.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const ensureValidCompanyId = (companyId) => {
  if (!companyId || Number.isNaN(Number(companyId))) {
    throw new AppError('Empresa do usuário não identificada', 401);
  }
};

const ensureEmployeeBelongsToCompany = async (employeeId, companyId) => {
  ensureValidCompanyId(companyId);

  const employee = await prisma.employee.findFirst({
    where: buildEmployeeAccessWhere(employeeId, companyId),
    select: employeeSelect,
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  return employee;
};

const ensureVacationBelongsToCompany = async (vacationId, companyId) => {
  ensureValidCompanyId(companyId);

  const vacation = await prisma.vacation.findFirst({
    where: {
      id: Number(vacationId),
      employee: buildEmployeeRelationCompanyWhere(companyId),
    },
    include: {
      employee: {
        select: employeeSelect,
      },
    },
  });

  if (!vacation) {
    throw new AppError('Registro de férias não encontrado', 404);
  }

  return vacation;
};

export const createVacationService = async (data, companyId) => {
  ensureValidCompanyId(companyId);
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const vacation = await prisma.vacation.create({
    data: {
      employeeId: Number(data.employeeId),
      acquisitionPeriod: data.acquisitionPeriod,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: Number(data.days),
      status: data.status,
    },
    include: {
      employee: {
        select: employeeSelect,
      },
    },
  });

  return vacation;
};

export const getAllVacationsService = async (companyId) => {
  ensureValidCompanyId(companyId);

  const vacations = await prisma.vacation.findMany({
    where: {
      employee: buildEmployeeRelationCompanyWhere(companyId),
    },
    include: {
      employee: {
        select: employeeSelect,
      },
    },
    orderBy: [
      {
        startDate: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return vacations;
};

export const getVacationsByEmployeeService = async (employeeId, companyId) => {
  ensureValidCompanyId(companyId);
  await ensureEmployeeBelongsToCompany(employeeId, companyId);

  const vacations = await prisma.vacation.findMany({
    where: {
      employeeId: Number(employeeId),
      employee: buildEmployeeRelationCompanyWhere(companyId),
    },
    include: {
      employee: {
        select: employeeSelect,
      },
    },
    orderBy: [
      {
        startDate: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return vacations;
};

export const updateVacationService = async (vacationId, data, companyId) => {
  ensureValidCompanyId(companyId);
  await ensureVacationBelongsToCompany(vacationId, companyId);
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const vacation = await prisma.vacation.update({
    where: {
      id: Number(vacationId),
    },
    data: {
      employeeId: Number(data.employeeId),
      acquisitionPeriod: data.acquisitionPeriod,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: Number(data.days),
      status: data.status,
    },
    include: {
      employee: {
        select: employeeSelect,
      },
    },
  });

  return vacation;
};

export const deleteVacationService = async (vacationId, companyId) => {
  ensureValidCompanyId(companyId);
  await ensureVacationBelongsToCompany(vacationId, companyId);

  await prisma.vacation.delete({
    where: {
      id: Number(vacationId),
    },
  });
};
