import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const parseDateField = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} é obrigatório`, 400);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} inválida`, 400);
  }

  return date;
};

const ensureEmployeeFromCompany = async (employeeId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return employee;
};

export const createVacationService = async (data, companyId) => {
  const employeeId = Number(data.employeeId);
  const startDate = parseDateField(data.startDate, 'Data de início');
  const endDate = parseDateField(data.endDate, 'Data de fim');
  const days = Number(data.days);

  await ensureEmployeeFromCompany(employeeId, companyId);

  if (!days || days <= 0) {
    throw new AppError('Quantidade de dias inválida', 400);
  }

  if (startDate > endDate) {
    throw new AppError('A data inicial não pode ser maior que a final', 400);
  }

  const overlap = await prisma.vacation.findFirst({
    where: {
      employeeId,
      employee: {
        companyId,
      },
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    },
  });

  if (overlap) {
    throw new AppError(
      'Já existe férias nesse período para esse colaborador',
      400
    );
  }

  return await prisma.vacation.create({
    data: {
      employeeId,
      acquisitionPeriod: data.acquisitionPeriod,
      startDate,
      endDate,
      days,
      status: data.status || 'PENDENTE',
    },
    include: {
      employee: true,
    },
  });
};

export const getAllVacationsService = async (companyId) => {
  return await prisma.vacation.findMany({
    where: {
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
    orderBy: { id: 'desc' },
  });
};

export const getVacationsByEmployeeService = async (employeeId, companyId) => {
  const id = Number(employeeId);

  await ensureEmployeeFromCompany(id, companyId);

  return await prisma.vacation.findMany({
    where: {
      employeeId: id,
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
    orderBy: { id: 'desc' },
  });
};

export const updateVacationService = async (vacationId, data, companyId) => {
  const id = Number(vacationId);
  const employeeId = Number(data.employeeId);
  const startDate = parseDateField(data.startDate, 'Data de início');
  const endDate = parseDateField(data.endDate, 'Data de fim');
  const days = Number(data.days);

  const vacationExists = await prisma.vacation.findFirst({
    where: {
      id,
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
  });

  if (!vacationExists) {
    throw new AppError('Registro de férias não encontrado', 404);
  }

  await ensureEmployeeFromCompany(employeeId, companyId);

  if (!days || days <= 0) {
    throw new AppError('Quantidade de dias inválida', 400);
  }

  if (startDate > endDate) {
    throw new AppError('A data inicial não pode ser maior que a final', 400);
  }

  const overlap = await prisma.vacation.findFirst({
    where: {
      id: { not: id },
      employeeId,
      employee: {
        companyId,
      },
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    },
  });

  if (overlap) {
    throw new AppError(
      'Já existe férias nesse período para esse colaborador',
      400
    );
  }

  return await prisma.vacation.update({
    where: { id },
    data: {
      employeeId,
      acquisitionPeriod: data.acquisitionPeriod,
      startDate,
      endDate,
      days,
      status: data.status || 'PENDENTE',
    },
    include: {
      employee: true,
    },
  });
};

export const deleteVacationService = async (vacationId, companyId) => {
  const id = Number(vacationId);

  const vacationExists = await prisma.vacation.findFirst({
    where: {
      id,
      employee: {
        companyId,
      },
    },
  });

  if (!vacationExists) {
    throw new AppError('Registro de férias não encontrado', 404);
  }

  await prisma.vacation.delete({
    where: { id },
  });
};
