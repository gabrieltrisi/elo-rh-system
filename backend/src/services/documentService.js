import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { buildEmployeeAccessWhere } from '../utils/employeeCompanyAccess.js';
import { registerManagedFileService } from './storageIntegrationService.js';

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
    where: buildEmployeeAccessWhere(employeeId, companyId),
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

export const createDocumentService = async (data, companyId, options = {}) => {
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

  try {
    if (options.file || data.fileUrl) {
      await registerManagedFileService({
        companyId,
        module: 'documents',
        entityType: 'document',
        entityId: document.id,
        employeeId: document.employeeId,
        uploadedByUserId: options.uploadedByUserId || null,
        file: options.file || null,
        originalName: data.fileName,
        storedPath: data.fileUrl,
      });
    }
  } catch (error) {
    await prisma.document.delete({
      where: {
        id: document.id,
      },
    });
    throw error;
  }

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

  const storageObjects = await prisma.storageObject.findMany({
    where: {
      companyId: Number(companyId),
      entityType: 'document',
      entityId: {
        in: documents.map((document) => document.id),
      },
      isCurrent: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  const storageByEntityId = new Map();

  storageObjects.forEach((storageObject) => {
    if (!storageByEntityId.has(storageObject.entityId)) {
      storageByEntityId.set(storageObject.entityId, storageObject);
    }
  });

  return documents.map((document) => {
    const storageObject = storageByEntityId.get(document.id) || null;

    return {
      ...document,
      storageObject,
      storageSyncStatus: storageObject?.syncStatus || 'LOCAL_ONLY',
      corporateUrl: storageObject?.webUrl || storageObject?.externalUrl || null,
    };
  });
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

  await prisma.$transaction(async (tx) => {
    await tx.storageObject.updateMany({
      where: {
        companyId: Number(companyId),
        entityType: 'document',
        entityId: Number(documentId),
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        syncStatus: 'ARCHIVED',
        syncMessage: 'Documento removido do EloSystem',
      },
    });

    await tx.document.delete({
      where: {
        id: Number(documentId),
      },
    });
  });

  return document;
};
