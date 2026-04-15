import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const benefitSelect = {
  id: true,
  employeeId: true,
  companyId: true,
  transportVoucher: true,
  transportVoucherType: true,
  mealVoucher: true,
  mealVoucherType: true,
  healthPlan: true,
  dentalPlan: true,
  notes: true,
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

const ensureBenefitBelongsToCompany = async (benefitId, companyId) => {
  const benefit = await prisma.benefit.findFirst({
    where: {
      id: Number(benefitId),
      companyId: Number(companyId),
    },
    select: benefitSelect,
  });

  if (!benefit) {
    throw new AppError('Cadastro de benefícios não encontrado', 404);
  }

  return benefit;
};

export const createOrUpdateBenefitService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const existingBenefit = await prisma.benefit.findFirst({
    where: {
      employeeId: Number(data.employeeId),
      companyId: Number(companyId),
    },
    select: {
      id: true,
    },
  });

  if (existingBenefit) {
    return await prisma.benefit.update({
      where: {
        id: existingBenefit.id,
      },
      data: {
        transportVoucher: data.transportVoucher,
        transportVoucherType: data.transportVoucherType,
        mealVoucher: data.mealVoucher,
        mealVoucherType: data.mealVoucherType,
        healthPlan: data.healthPlan,
        dentalPlan: data.dentalPlan,
        notes: data.notes,
      },
      select: benefitSelect,
    });
  }

  return await prisma.benefit.create({
    data: {
      employeeId: Number(data.employeeId),
      companyId: Number(companyId),
      transportVoucher: data.transportVoucher,
      transportVoucherType: data.transportVoucherType,
      mealVoucher: data.mealVoucher,
      mealVoucherType: data.mealVoucherType,
      healthPlan: data.healthPlan,
      dentalPlan: data.dentalPlan,
      notes: data.notes,
    },
    select: benefitSelect,
  });
};

export const getBenefitsService = async (companyId) => {
  return await prisma.benefit.findMany({
    where: {
      companyId: Number(companyId),
    },
    select: benefitSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deleteBenefitService = async (benefitId, companyId) => {
  await ensureBenefitBelongsToCompany(benefitId, companyId);

  await prisma.benefit.delete({
    where: {
      id: Number(benefitId),
    },
  });
};
