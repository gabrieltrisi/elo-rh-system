import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const parseDateField = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} é obrigatório`, 400);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} inválido`, 400);
  }

  return date;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

export const createEmployeeService = async (data, companyId) => {
  const employeeExists = await prisma.employee.findFirst({
    where: {
      companyId,
      OR: [{ email: data.email }, { cpf: data.cpf }],
    },
  });

  if (employeeExists) {
    throw new AppError('Já existe colaborador com este e-mail ou CPF', 400);
  }

  return await prisma.employee.create({
    data: {
      name: data.name,
      cpf: data.cpf,
      birthDate: parseDateField(data.birthDate, 'Data de nascimento'),
      maritalStatus: data.maritalStatus,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      admissionDate: parseDateField(data.admissionDate, 'Data de admissão'),
      status: data.status || 'ativo',
      shirtSize: normalizeOptionalString(data.shirtSize),
      pantsSize: normalizeOptionalString(data.pantsSize),
      bootSize: normalizeOptionalString(data.bootSize),
      notes: normalizeOptionalString(data.notes),
      companyId,
    },
  });
};

export const getAllEmployeesService = async (companyId) => {
  return await prisma.employee.findMany({
    where: { companyId },
    orderBy: { id: 'desc' },
  });
};

export const getEmployeeByIdService = async (id, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  return employee;
};

export const updateEmployeeService = async (id, data, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  const employeeWithSameData = await prisma.employee.findFirst({
    where: {
      companyId,
      id: { not: id },
      OR: [{ email: data.email }, { cpf: data.cpf }],
    },
  });

  if (employeeWithSameData) {
    throw new AppError('Já existe colaborador com este e-mail ou CPF', 400);
  }

  return await prisma.employee.update({
    where: { id },
    data: {
      name: data.name,
      cpf: data.cpf,
      birthDate: parseDateField(data.birthDate, 'Data de nascimento'),
      maritalStatus: data.maritalStatus,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      admissionDate: parseDateField(data.admissionDate, 'Data de admissão'),
      status: data.status || 'ativo',
      shirtSize: normalizeOptionalString(data.shirtSize),
      pantsSize: normalizeOptionalString(data.pantsSize),
      bootSize: normalizeOptionalString(data.bootSize),
      notes: normalizeOptionalString(data.notes),
    },
  });
};

export const deleteEmployeeService = async (id, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!employee) {
    throw new AppError('Funcionário não encontrado', 404);
  }

  await prisma.employee.delete({
    where: { id },
  });
};
