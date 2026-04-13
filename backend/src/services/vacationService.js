import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const ensureEmployeeBelongsToCompany = async (employeeId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
    select: employeeSelect,
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  return employee;
};

const ensureVacationBelongsToCompany = async (vacationId, companyId) => {
  const vacation = await prisma.vacation.findFirst({
    where: {
      id: vacationId,
      employee: {
        companyId,
      },
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
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const vacation = await prisma.vacation.create({
    data: {
      employeeId: data.employeeId,
      acquisitionPeriod: data.acquisitionPeriod,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: data.days,
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
  const vacations = await prisma.vacation.findMany({
    where: {
      employee: {
        companyId,
      },
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
  await ensureEmployeeBelongsToCompany(employeeId, companyId);

  const vacations = await prisma.vacation.findMany({
    where: {
      employeeId,
      employee: {
        companyId,
      },
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
  await ensureVacationBelongsToCompany(vacationId, companyId);
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const vacation = await prisma.vacation.update({
    where: {
      id: vacationId,
    },
    data: {
      employeeId: data.employeeId,
      acquisitionPeriod: data.acquisitionPeriod,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: data.days,
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
  await ensureVacationBelongsToCompany(vacationId, companyId);

  await prisma.vacation.delete({
    where: {
      id: vacationId,
    },
  });
};
