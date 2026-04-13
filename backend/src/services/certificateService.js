import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  status: true,
};

const certificateSelect = {
  id: true,
  employeeId: true,
  title: true,
  startDate: true,
  endDate: true,
  days: true,
  fileUrl: true,
  status: true,
  managerNotes: true,
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

const ensureCertificateBelongsToCompany = async (certificateId, companyId) => {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: Number(certificateId),
      employee: {
        companyId: Number(companyId),
      },
    },
    select: certificateSelect,
  });

  if (!certificate) {
    throw new AppError('Atestado não encontrado', 404);
  }

  return certificate;
};

export const createCertificateService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  return await prisma.certificate.create({
    data: {
      employeeId: Number(data.employeeId),
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: Number(data.days),
      fileUrl: data.fileUrl || null,
      status: data.status || 'Registrado',
      managerNotes: data.managerNotes || null,
    },
    select: certificateSelect,
  });
};

export const getCertificatesService = async (companyId) => {
  return await prisma.certificate.findMany({
    where: {
      employee: {
        companyId: Number(companyId),
      },
    },
    select: certificateSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const updateCertificateStatusService = async (
  id,
  status,
  managerNotes,
  companyId
) => {
  await ensureCertificateBelongsToCompany(id, companyId);

  return await prisma.certificate.update({
    where: {
      id: Number(id),
    },
    data: {
      status,
      managerNotes: managerNotes || null,
    },
    select: certificateSelect,
  });
};

export const deleteCertificateService = async (id, companyId) => {
  await ensureCertificateBelongsToCompany(id, companyId);

  await prisma.certificate.delete({
    where: {
      id: Number(id),
    },
  });
};
