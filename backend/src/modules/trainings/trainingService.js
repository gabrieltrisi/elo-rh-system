import path from 'path';
import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import {
  buildEmployeeAccessWhere,
  buildEmployeeRelationCompanyWhere,
} from '../../utils/employeeCompanyAccess.js';
import { buildUploadedFileUrl, resolveFileReference } from '../../utils/filePath.js';
import {
  TRAINING_VALIDITY_STATUS,
  getTrainingValiditySnapshot,
} from '../../utils/trainingStatus.js';
import { registerManagedFileService } from '../../services/storageIntegrationService.js';

const DEFAULT_WARNING_DAYS = 30;

const trainingInclude = {
  company: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  employee: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      role: true,
      status: true,
      employeeCompanies: {
        select: {
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  },
  training: {
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      workloadHours: true,
      description: true,
      isMandatory: true,
      renewalDays: true,
    },
  },
};

const normalizeText = (value) => String(value || '').trim();

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const buildCertificatePermalink = ({ employeeName, trainingTitle }) => {
  const base = [slugify(trainingTitle), slugify(employeeName)]
    .filter(Boolean)
    .join('-');

  const randomSuffix = Math.random().toString(36).slice(2, 10);

  return `${base || 'certificado'}-${randomSuffix}`;
};

const resolveCompanyId = (requestedCompanyId, userCompanyId) => {
  const companyId = Number(requestedCompanyId || userCompanyId);

  if (Number.isNaN(companyId) || companyId <= 0) {
    throw new AppError('Empresa invalida para o certificado', 400);
  }

  return companyId;
};

const normalizeOperationalStatus = (status) => {
  const normalized = String(status || 'PENDENTE').trim().toUpperCase();
  const allowed = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'VENCIDO', 'RECICLAGEM'];
  return allowed.includes(normalized) ? normalized : 'PENDENTE';
};

const normalizeOptionalDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Data invalida informada para a capacitacao', 400);
  }

  return parsed;
};

const ensureEmployeeBelongsToCompany = async (employeeId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: buildEmployeeAccessWhere(employeeId, companyId),
    select: {
      id: true,
      name: true,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador nao encontrado para esta empresa', 404);
  }

  return employee;
};

const ensureCompanyExists = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: {
      id: Number(companyId),
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!company) {
    throw new AppError('Empresa nao encontrada', 404);
  }

  return company;
};

const resolveTrainingCatalog = async ({
  companyId,
  title,
  category,
  workloadHours,
  description,
  isMandatory,
  renewalDays,
}) => {
  const normalizedTitle = normalizeText(title);
  const normalizedCategory = normalizeText(category);

  const existingTraining = await prisma.training.findFirst({
    where: {
      companyId: Number(companyId),
      title: normalizedTitle,
      category: normalizedCategory,
    },
  });

  if (existingTraining) {
    return prisma.training.update({
      where: {
        id: existingTraining.id,
      },
      data: {
        workloadHours: workloadHours ?? existingTraining.workloadHours,
        description:
          description !== undefined
            ? normalizeText(description) || null
            : existingTraining.description,
        isMandatory:
          typeof isMandatory === 'boolean'
            ? isMandatory
            : existingTraining.isMandatory,
        renewalDays:
          renewalDays !== undefined ? renewalDays : existingTraining.renewalDays,
      },
    });
  }

  return prisma.training.create({
    data: {
      companyId: Number(companyId),
      title: normalizedTitle,
      slug: `${slugify(normalizedTitle)}-${Date.now()}`,
      category: normalizedCategory,
      workloadHours,
      description: normalizeText(description) || null,
      isMandatory: Boolean(isMandatory),
      renewalDays,
    },
  });
};

const getStorageObjectsMap = async (companyId, entityIds = []) => {
  if (!entityIds.length) {
    return new Map();
  }

  const objects = await prisma.storageObject.findMany({
    where: {
      companyId: Number(companyId),
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: {
        in: entityIds.map(Number),
      },
      isCurrent: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return objects.reduce((acc, item) => {
    if (!acc.has(item.entityId)) {
      acc.set(item.entityId, item);
    }
    return acc;
  }, new Map());
};

const buildAttachmentPayload = (item, storageObject = null) => {
  if (!storageObject && !item.certificateFileUrl) {
    return null;
  }

  return {
    fileName:
      storageObject?.fileName ||
      item.certificateFileName ||
      path.basename(String(item.certificateFileUrl || 'certificado')),
    mimeType: storageObject?.mimeType || null,
    syncStatus: storageObject?.syncStatus || 'LOCAL_ONLY',
    corporateUrl: storageObject?.webUrl || storageObject?.externalUrl || null,
    storageObjectId: storageObject?.id || null,
    viewUrl: `/trainings/${item.id}/attachment/view`,
    downloadUrl: `/trainings/${item.id}/attachment/download`,
  };
};

const formatEmployeeTraining = (item, storageObject = null) => {
  const validity = getTrainingValiditySnapshot({
    status: item.status,
    completedAt: item.completedAt,
    expiresAt: item.expiresAt,
    warningDays: item.training?.renewalDays || DEFAULT_WARNING_DAYS,
  });

  return {
    id: item.id,
    operationalStatus: item.status,
    validityStatus: validity.status,
    validityLabel: validity.label,
    expiringInDays: validity.expiringInDays,
    issuerName: item.issuerName || '',
    completedAt: item.completedAt,
    expiresAt: item.expiresAt,
    notes: item.notes || '',
    certificateFileName: item.certificateFileName || '',
    certificateFileUrl: item.certificateFileUrl || '',
    certificatePermalink: item.certificatePermalink || '',
    certificatePublicUrl: item.certificatePermalink
      ? `/trainings/certificates/${item.certificatePermalink}`
      : '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    company: item.company,
    attachment: buildAttachmentPayload(item, storageObject),
    employee: {
      id: item.employee.id,
      name: item.employee.name,
      email: item.employee.email,
      department: item.employee.department,
      role: item.employee.role,
      status: item.employee.status,
      companies: item.employee.employeeCompanies.map((link) => ({
        companyId: link.company?.id || link.companyId,
        companyName: link.company?.name || '',
        companyCode: link.company?.code || '',
      })),
    },
    training: item.training,
  };
};

const buildSummary = (trainings = []) => {
  const total = trainings.length;
  const valid = trainings.filter(
    (item) => item.validityStatus === TRAINING_VALIDITY_STATUS.VALIDO
  ).length;
  const expiringSoon = trainings.filter(
    (item) => item.validityStatus === TRAINING_VALIDITY_STATUS.VENCENDO
  ).length;
  const expired = trainings.filter(
    (item) => item.validityStatus === TRAINING_VALIDITY_STATUS.VENCIDO
  ).length;
  const pendingEmployees = new Set(
    trainings
      .filter((item) =>
        [
          TRAINING_VALIDITY_STATUS.PENDENTE,
          TRAINING_VALIDITY_STATUS.VENCENDO,
          TRAINING_VALIDITY_STATUS.VENCIDO,
        ].includes(item.validityStatus)
      )
      .map((item) => item.employee.id)
  ).size;
  const recentAttachments = trainings.filter((item) => item.attachment).slice(0, 5);

  return {
    total,
    valid,
    expiringSoon,
    expired,
    pendingEmployees,
    recentAttachments: recentAttachments.length,
  };
};

const buildOptions = (trainings = [], employees = [], companies = []) => ({
  employees: employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    department: employee.department || '-',
  })),
  companies,
  categories: [...new Set(trainings.map((item) => item.training.category).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'pt-BR')
  ),
  issuers: [...new Set(trainings.map((item) => item.issuerName).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'pt-BR')
  ),
});

const matchesDateRange = (value, start, end) => {
  if (!start && !end) return true;
  if (!value) return false;

  const current = new Date(value);
  if (Number.isNaN(current.getTime())) return false;

  if (start) {
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    if (current < startDate) return false;
  }

  if (end) {
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    if (current > endDate) return false;
  }

  return true;
};

const filterFormattedTrainings = (trainings, filters = {}) =>
  trainings.filter((item) => {
    const search = normalizeText(filters.search).toLowerCase();

    const matchesSearch = search
      ? `
          ${item.employee.name}
          ${item.training.title}
          ${item.training.category}
          ${item.issuerName}
          ${item.company?.name || ''}
          ${item.notes || ''}
        `
          .toLowerCase()
          .includes(search)
      : true;

    const matchesEmployee = filters.employeeId
      ? Number(item.employee.id) === Number(filters.employeeId)
      : true;
    const matchesCompany =
      filters.companyId && String(filters.companyId).toLowerCase() !== 'todos'
        ? Number(item.company?.id) === Number(filters.companyId)
        : true;
    const matchesCategory = filters.category
      ? item.training.category === filters.category
      : true;
    const matchesIssuer = filters.issuerName
      ? item.issuerName === filters.issuerName
      : true;
    const matchesOperationalStatus = filters.status
      ? item.operationalStatus === normalizeOperationalStatus(filters.status)
      : true;
    const matchesValidity = filters.validityStatus
      ? item.validityStatus === filters.validityStatus
      : true;
    const matchesCompletedAt = matchesDateRange(
      item.completedAt,
      filters.issueStart,
      filters.issueEnd
    );
    const matchesExpiresAt = matchesDateRange(
      item.expiresAt,
      filters.expirationStart,
      filters.expirationEnd
    );

    return (
      matchesSearch &&
      matchesEmployee &&
      matchesCompany &&
      matchesCategory &&
      matchesIssuer &&
      matchesOperationalStatus &&
      matchesValidity &&
      matchesCompletedAt &&
      matchesExpiresAt
    );
  });

const getEmployeeTrainingRecordOrThrow = async (trainingRecordId, companyId) => {
  const record = await prisma.employeeTraining.findFirst({
    where: {
      id: Number(trainingRecordId),
      companyId: Number(companyId),
    },
    include: trainingInclude,
  });

  if (!record) {
    throw new AppError('Registro de certificado nao encontrado', 404);
  }

  return record;
};

export const createEmployeeTrainingService = async (
  data,
  userCompanyId,
  userId = null
) => {
  const companyId = resolveCompanyId(data.companyId, userCompanyId);

  await ensureCompanyExists(companyId);

  if (!data.employeeId) {
    throw new AppError('Selecione um colaborador para vincular o certificado', 400);
  }

  if (!normalizeText(data.title)) {
    throw new AppError('Informe o nome do certificado ou capacitacao', 400);
  }

  if (!normalizeText(data.category)) {
    throw new AppError('Informe a categoria do certificado', 400);
  }

  const employee = await ensureEmployeeBelongsToCompany(data.employeeId, companyId);

  const training = await resolveTrainingCatalog({
    companyId,
    title: data.title,
    category: data.category,
    workloadHours:
      data.workloadHours !== undefined && data.workloadHours !== null && data.workloadHours !== ''
        ? Number(data.workloadHours)
        : null,
    description: data.description,
    isMandatory:
      String(data.isMandatory || '').toLowerCase() === 'true' ||
      data.isMandatory === true,
    renewalDays:
      data.renewalDays !== undefined && data.renewalDays !== null && data.renewalDays !== ''
        ? Number(data.renewalDays)
        : null,
  });

  const employeeTraining = await prisma.employeeTraining.create({
    data: {
      employeeId: Number(data.employeeId),
      trainingId: training.id,
      companyId,
      issuerName: normalizeText(data.issuerName) || null,
      completedAt: normalizeOptionalDate(data.completedAt),
      expiresAt: normalizeOptionalDate(data.expiresAt),
      status: normalizeOperationalStatus(data.status),
      notes: normalizeText(data.notes) || null,
      certificateFileName: data.certificateFile?.originalname || data.certificateFileName || null,
      certificateFileUrl:
        data.certificateFile ? buildUploadedFileUrl(data.certificateFile) : data.certificateFileUrl || null,
      certificatePermalink: data.certificateFile
        ? buildCertificatePermalink({
            employeeName: employee.name,
            trainingTitle: training.title,
          })
        : null,
    },
    include: trainingInclude,
  });

  if (data.certificateFile) {
    await registerManagedFileService({
      companyId,
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: employeeTraining.id,
      employeeId: employeeTraining.employeeId,
      uploadedByUserId: userId,
      file: data.certificateFile,
      originalName: data.certificateFile.originalname,
      mimeType: data.certificateFile.mimetype,
      size: data.certificateFile.size,
      storedName: data.certificateFile.filename,
      storedPath: buildUploadedFileUrl(data.certificateFile),
    });
  }

  const storageMap = await getStorageObjectsMap(companyId, [employeeTraining.id]);
  return formatEmployeeTraining(employeeTraining, storageMap.get(employeeTraining.id));
};

export const getAllEmployeeTrainingsService = async (filters, userCompanyId) => {
  const companyId =
    filters.companyId && String(filters.companyId).toLowerCase() !== 'todos'
      ? resolveCompanyId(filters.companyId, userCompanyId)
      : Number(userCompanyId);

  const [records, employees, companies] = await Promise.all([
    prisma.employeeTraining.findMany({
      where: {
        companyId,
      },
      include: trainingInclude,
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.employee.findMany({
      where: buildEmployeeRelationCompanyWhere(companyId),
      select: {
        id: true,
        name: true,
        department: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.company.findMany({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
  ]);

  const storageMap = await getStorageObjectsMap(
    companyId,
    records.map((item) => item.id)
  );
  const formatted = records.map((item) =>
    formatEmployeeTraining(item, storageMap.get(item.id))
  );
  const filtered = filterFormattedTrainings(formatted, filters);

  return {
    trainings: filtered,
    summary: buildSummary(filtered),
    options: buildOptions(formatted, employees, companies),
  };
};

export const updateEmployeeTrainingService = async (
  trainingRecordId,
  data,
  userCompanyId,
  userId = null
) => {
  const companyId =
    data.companyId !== undefined && data.companyId !== null && data.companyId !== ''
      ? resolveCompanyId(data.companyId, userCompanyId)
      : null;

  const existingRecord = await prisma.employeeTraining.findFirst({
    where: {
      id: Number(trainingRecordId),
      ...(companyId ? { companyId } : {}),
    },
    include: trainingInclude,
  });

  if (!existingRecord) {
    throw new AppError('Registro de certificado nao encontrado', 404);
  }

  const targetCompanyId = companyId || existingRecord.companyId;
  const employeeId = Number(data.employeeId || existingRecord.employeeId);
  const employee = await ensureEmployeeBelongsToCompany(employeeId, targetCompanyId);

  const training = await resolveTrainingCatalog({
    companyId: targetCompanyId,
    title: data.title || existingRecord.training.title,
    category: data.category || existingRecord.training.category,
    workloadHours:
      data.workloadHours !== undefined && data.workloadHours !== null && data.workloadHours !== ''
        ? Number(data.workloadHours)
        : existingRecord.training.workloadHours,
    description:
      data.description !== undefined
        ? data.description
        : existingRecord.training.description,
    isMandatory:
      data.isMandatory !== undefined
        ? String(data.isMandatory).toLowerCase() === 'true' || data.isMandatory === true
        : existingRecord.training.isMandatory,
    renewalDays:
      data.renewalDays !== undefined && data.renewalDays !== null && data.renewalDays !== ''
        ? Number(data.renewalDays)
        : existingRecord.training.renewalDays,
  });

  const updated = await prisma.employeeTraining.update({
    where: {
      id: Number(trainingRecordId),
    },
    data: {
      employeeId,
      trainingId: training.id,
      companyId: targetCompanyId,
      issuerName:
        data.issuerName !== undefined
          ? normalizeText(data.issuerName) || null
          : existingRecord.issuerName,
      completedAt:
        data.completedAt !== undefined
          ? normalizeOptionalDate(data.completedAt)
          : existingRecord.completedAt,
      expiresAt:
        data.expiresAt !== undefined
          ? normalizeOptionalDate(data.expiresAt)
          : existingRecord.expiresAt,
      status:
        data.status !== undefined
          ? normalizeOperationalStatus(data.status)
          : existingRecord.status,
      notes:
        data.notes !== undefined
          ? normalizeText(data.notes) || null
          : existingRecord.notes,
      certificateFileName: data.certificateFile
        ? data.certificateFile.originalname
        : data.certificateFileName !== undefined
        ? data.certificateFileName || null
        : existingRecord.certificateFileName,
      certificateFileUrl: data.certificateFile
        ? buildUploadedFileUrl(data.certificateFile)
        : data.certificateFileUrl !== undefined
        ? data.certificateFileUrl || null
        : existingRecord.certificateFileUrl,
      certificatePermalink: data.certificateFile
        ? existingRecord.certificatePermalink ||
          buildCertificatePermalink({
            employeeName: employee.name,
            trainingTitle: training.title,
          })
        : data.certificateFileUrl !== undefined
        ? data.certificateFileUrl
          ? existingRecord.certificatePermalink ||
            buildCertificatePermalink({
              employeeName: employee.name,
              trainingTitle: training.title,
            })
          : null
        : existingRecord.certificatePermalink,
    },
    include: trainingInclude,
  });

  if (data.certificateFile) {
    await registerManagedFileService({
      companyId: targetCompanyId,
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: updated.id,
      employeeId: updated.employeeId,
      uploadedByUserId: userId,
      file: data.certificateFile,
      originalName: data.certificateFile.originalname,
      mimeType: data.certificateFile.mimetype,
      size: data.certificateFile.size,
      storedName: data.certificateFile.filename,
      storedPath: buildUploadedFileUrl(data.certificateFile),
    });
  }

  const storageMap = await getStorageObjectsMap(targetCompanyId, [updated.id]);
  return formatEmployeeTraining(updated, storageMap.get(updated.id));
};

export const deleteEmployeeTrainingService = async (
  trainingRecordId,
  userCompanyId,
  requestedCompanyId
) => {
  const companyId =
    requestedCompanyId !== undefined &&
    requestedCompanyId !== null &&
    requestedCompanyId !== ''
      ? resolveCompanyId(requestedCompanyId, userCompanyId)
      : Number(userCompanyId);

  const existingRecord = await getEmployeeTrainingRecordOrThrow(
    trainingRecordId,
    companyId
  );

  await prisma.employeeTraining.delete({
    where: {
      id: Number(trainingRecordId),
    },
  });

  return existingRecord;
};

export const getCertificateByPermalinkService = async (permalink) => {
  const certificate = await prisma.employeeTraining.findFirst({
    where: {
      certificatePermalink: String(permalink || ''),
    },
    include: trainingInclude,
  });

  if (!certificate || !certificate.certificateFileUrl) {
    throw new AppError('Certificado nao encontrado', 404);
  }

  return formatEmployeeTraining(certificate);
};

export const getTrainingAttachmentStreamService = async (
  trainingRecordId,
  companyId,
  download = false
) => {
  const record = await getEmployeeTrainingRecordOrThrow(trainingRecordId, companyId);
  const storageMap = await getStorageObjectsMap(companyId, [record.id]);
  const storageObject = storageMap.get(record.id);

  const resolved = resolveFileReference({
    moduleKey: 'trainings',
    filename: storageObject?.storedName || record.certificateFileName,
    storedPath:
      storageObject?.localFallbackPath ||
      storageObject?.path ||
      record.certificateFileUrl,
  });

  if (!resolved) {
    throw new AppError('Arquivo do certificado nao encontrado', 404);
  }

  return {
    absolutePath: resolved.absolutePath,
    fileName:
      storageObject?.fileName ||
      record.certificateFileName ||
      resolved.filename,
    mimeType: storageObject?.mimeType || null,
    inline: !download && resolved.canInline,
    record: formatEmployeeTraining(record, storageObject),
  };
};
