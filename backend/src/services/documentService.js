import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';

const documentSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  fileName: true,
  fileUrl: true,
  employeeId: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      status: true,
    },
  },
};

const ensureEmployeeBelongsToCompany = async (employeeId, companyId) => {
  if (!employeeId) return null;

  const employee = await prisma.employee.findFirst({
    where: {
      id: Number(employeeId),
      companyId: Number(companyId),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  return employee;
};

export const createDocumentService = async (data, companyId) => {
  await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const document = await prisma.document.create({
    data: {
      title: data.title,
      description: data.description || null,
      category: data.category,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      employeeId: data.employeeId ? Number(data.employeeId) : null,
      companyId: Number(companyId),
    },
    select: documentSelect,
  });

  return document;
};

export const getAllDocumentsService = async (companyId) => {
  const documents = await prisma.document.findMany({
    where: {
      companyId: Number(companyId),
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: documentSelect,
  });

  return documents;
};

export const deleteDocumentService = async (documentId, companyId) => {
  const document = await prisma.document.findFirst({
    where: {
      id: Number(documentId),
      companyId: Number(companyId),
    },
  });

  if (!document) {
    throw new AppError('Documento não encontrado', 404);
  }

  await prisma.document.delete({
    where: {
      id: Number(documentId),
    },
  });
};
