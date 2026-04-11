import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

export const createWorkScheduleService = async (data, companyId) => {
  const employeeId = Number(data.employeeId);

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return await prisma.workSchedule.create({
    data: {
      employeeId,
      scheduleType: data.scheduleType,
      workModel: data.workModel || null,
      categoryType: data.categoryType || null,
      isTrustPosition: Boolean(data.isTrustPosition),
      worksOnHolidays: Boolean(data.worksOnHolidays),
      observations: data.observations || null,
    },
    include: {
      employee: true,
    },
  });
};

export const getAllWorkSchedulesService = async (companyId) => {
  return await prisma.workSchedule.findMany({
    where: {
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getWorkScheduleByEmployeeService = async (
  employeeId,
  companyId
) => {
  const id = Number(employeeId);

  const employee = await prisma.employee.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return await prisma.workSchedule.findMany({
    where: {
      employeeId: id,
    },
    include: {
      employee: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const updateWorkScheduleService = async (id, data, companyId) => {
  const scheduleId = Number(id);

  const existingSchedule = await prisma.workSchedule.findFirst({
    where: {
      id: scheduleId,
      employee: {
        companyId,
      },
    },
    include: {
      employee: true,
    },
  });

  if (!existingSchedule) {
    throw new AppError('Escala não encontrada', 404);
  }

  const employeeId = Number(data.employeeId);

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado', 404);
  }

  return await prisma.workSchedule.update({
    where: {
      id: scheduleId,
    },
    data: {
      employeeId,
      scheduleType: data.scheduleType,
      workModel: data.workModel || null,
      categoryType: data.categoryType || null,
      isTrustPosition: Boolean(data.isTrustPosition),
      worksOnHolidays: Boolean(data.worksOnHolidays),
      observations: data.observations || null,
    },
    include: {
      employee: true,
    },
  });
};

export const deleteWorkScheduleService = async (id, companyId) => {
  const scheduleId = Number(id);

  const existingSchedule = await prisma.workSchedule.findFirst({
    where: {
      id: scheduleId,
      employee: {
        companyId,
      },
    },
  });

  if (!existingSchedule) {
    throw new AppError('Escala não encontrada', 404);
  }

  await prisma.workSchedule.delete({
    where: {
      id: scheduleId,
    },
  });
};
