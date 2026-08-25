import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { parseTimeImportFile } from './timeParsingService.js';

const VALIDATED_ENTRY_INCLUDE = {
  employee: {
    select: {
      id: true,
      name: true,
      cpf: true,
      department: true,
      role: true,
      employeeCompanies: {
        select: {
          registrationNumber: true,
          department: true,
          role: true,
          companyId: true,
        },
      },
    },
  },
};

const buildEmployeeWhere = (companyId) => ({
  OR: [
    { companyId },
    {
      employeeCompanies: {
        some: {
          companyId,
        },
      },
    },
  ],
});

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

const getReferenceKey = (row) => {
  const employeeReference =
    row.employeeCodeSnapshot ||
    row.employeeDocumentSnapshot ||
    row.employeeNameSnapshot ||
    `linha-${row.sourceRowNumber}`;

  const dateReference = row.workDate
    ? new Date(row.workDate).toISOString().slice(0, 10)
    : 'sem-data';

  return `${employeeReference}|${dateReference}`;
};

const summarizeValidation = (entries) => {
  return entries.reduce(
    (accumulator, entry) => {
      accumulator.totalRows += 1;

      if (entry.validationStatus === 'VALIDO') {
        accumulator.validRows += 1;
        accumulator.recognizedEmployees += entry.employeeId ? 1 : 0;
      }

      if (entry.validationStatus === 'INVALIDO') {
        accumulator.invalidRows += 1;
      }

      if (entry.validationStatus === 'PENDENTE_VINCULO') {
        accumulator.pendingRows += 1;
      }

      if (entry.validationStatus === 'DUPLICADO') {
        accumulator.duplicateRows += 1;
      }

      return accumulator;
    },
    {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      pendingRows: 0,
      duplicateRows: 0,
      recognizedEmployees: 0,
    }
  );
};

const computeBatchPeriod = (entries) => {
  const dates = entries
    .map((entry) => entry.workDate)
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return {
    periodStart: dates[0] || null,
    periodEnd: dates[dates.length - 1] || null,
  };
};

const buildEmployeeMatcher = (employees) => {
  const byRegistration = new Map();
  const byCpf = new Map();
  const byName = new Map();

  employees.forEach((employee) => {
    employee.employeeCompanies.forEach((employeeCompany) => {
      if (employeeCompany.registrationNumber) {
        byRegistration.set(
          normalizeText(employeeCompany.registrationNumber),
          employee
        );
      }
    });

    if (employee.cpf) {
      byCpf.set(normalizeText(employee.cpf), employee);
    }

    if (employee.name) {
      byName.set(normalizeText(employee.name), employee);
    }
  });

  return (row) => {
    const registrationKey = normalizeText(row.employeeCodeSnapshot);
    if (registrationKey && byRegistration.has(registrationKey)) {
      return byRegistration.get(registrationKey);
    }

    const cpfKey = normalizeText(row.employeeDocumentSnapshot);
    if (cpfKey && byCpf.has(cpfKey)) {
      return byCpf.get(cpfKey);
    }

    const nameKey = normalizeText(row.employeeNameSnapshot);
    if (nameKey && byName.has(nameKey)) {
      return byName.get(nameKey);
    }

    return null;
  };
};

const buildValidationResult = (
  row,
  matchedEmployee,
  duplicateKeys,
  existingImportedKeys
) => {
  const errors = [];

  if (!row.workDate) {
    errors.push('Data de trabalho nao identificada');
  }

  if (
    !row.employeeNameSnapshot &&
    !row.employeeCodeSnapshot &&
    !row.employeeDocumentSnapshot
  ) {
    errors.push('Colaborador nao identificado na linha importada');
  }

  const rowKey = getReferenceKey(row);
  if (duplicateKeys.has(rowKey)) {
    errors.push('Linha duplicada no mesmo arquivo');
  }

  if (existingImportedKeys.has(rowKey)) {
    errors.push('Registro ja importado anteriormente para o mesmo dia');
  }

  if (errors.length > 0) {
    return {
      employeeId: matchedEmployee?.id || null,
      validationStatus: errors.some((error) => error.includes('duplicada'))
        ? 'DUPLICADO'
        : 'INVALIDO',
      validationErrors: errors,
    };
  }

  if (!matchedEmployee) {
    return {
      employeeId: null,
      validationStatus: 'PENDENTE_VINCULO',
      validationErrors: ['Colaborador nao reconhecido automaticamente'],
    };
  }

  return {
    employeeId: matchedEmployee.id,
    validationStatus: 'VALIDO',
    validationErrors: [],
  };
};

const loadCompanyEmployees = async (companyId) => {
  return prisma.employee.findMany({
    where: buildEmployeeWhere(companyId),
    include: {
      employeeCompanies: {
        where: { companyId },
        select: {
          registrationNumber: true,
          department: true,
          role: true,
          companyId: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

const loadImportedKeys = async (companyId) => {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      importBatch: {
        status: 'IMPORTADO',
      },
    },
    select: {
      employeeNameSnapshot: true,
      employeeDocumentSnapshot: true,
      employeeCodeSnapshot: true,
      workDate: true,
    },
  });

  return new Set(entries.map((entry) => getReferenceKey(entry)));
};

const mapBatchForResponse = (batch) => {
  const entries = Array.isArray(batch.entries) ? batch.entries : [];
  const previewSample = entries.slice(0, 8).map((entry) => ({
    id: entry.id,
    sourceRowNumber: entry.sourceRowNumber,
    employeeNameSnapshot: entry.employeeNameSnapshot,
    employeeCodeSnapshot: entry.employeeCodeSnapshot,
    employeeDocumentSnapshot: entry.employeeDocumentSnapshot,
    workDate: entry.workDate,
    workedMinutes: entry.workedMinutes,
    overtimeMinutes: entry.overtimeMinutes,
    delayMinutes: entry.delayMinutes,
    absenceMinutes: entry.absenceMinutes,
    bankHoursMinutes: entry.bankHoursMinutes,
    validationStatus: entry.validationStatus,
    validationErrors: Array.isArray(entry.validationErrors)
      ? entry.validationErrors
      : [],
    employee: entry.employee
      ? {
          id: entry.employee.id,
          name: entry.employee.name,
          department:
            entry.employee.employeeCompanies?.[0]?.department ||
            entry.employee.department ||
            '',
          role:
            entry.employee.employeeCompanies?.[0]?.role ||
            entry.employee.role ||
            '',
        }
      : null,
  }));

  return {
    ...batch,
    previewSample,
    entries,
  };
};

const recomputeTimeSummariesForEmployees = async (companyId, employeeIds = []) => {
  const uniqueEmployeeIds = [...new Set(employeeIds.filter(Boolean))];

  if (!uniqueEmployeeIds.length) {
    return;
  }

  for (const employeeId of uniqueEmployeeIds) {
    const entries = await prisma.timeEntry.findMany({
      where: {
        companyId,
        employeeId,
        validationStatus: 'VALIDO',
        importBatch: {
          status: 'IMPORTADO',
        },
      },
      orderBy: {
        workDate: 'asc',
      },
    });

    const grouped = entries.reduce((accumulator, entry) => {
      const date = new Date(entry.workDate);
      const referenceYear = date.getUTCFullYear();
      const referenceMonth = date.getUTCMonth() + 1;
      const key = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}`;

      if (!accumulator.has(key)) {
        accumulator.set(key, {
          referenceYear,
          referenceMonth,
          workedMinutes: 0,
          overtimeMinutes: 0,
          delayMinutes: 0,
          absenceMinutes: 0,
          bankHoursMinutes: 0,
        });
      }

      const current = accumulator.get(key);
      current.workedMinutes += entry.workedMinutes || 0;
      current.overtimeMinutes += entry.overtimeMinutes || 0;
      current.delayMinutes += entry.delayMinutes || 0;
      current.absenceMinutes += entry.absenceMinutes || 0;
      current.bankHoursMinutes += entry.bankHoursMinutes || 0;

      return accumulator;
    }, new Map());

    const orderedGroups = Array.from(grouped.values()).sort((left, right) => {
      if (left.referenceYear !== right.referenceYear) {
        return left.referenceYear - right.referenceYear;
      }

      return left.referenceMonth - right.referenceMonth;
    });

    const keysToKeep = new Set(
      orderedGroups.map(
        (group) => `${group.referenceYear}-${group.referenceMonth}`
      )
    );

    let previousBalanceMinutes = 0;

    for (const group of orderedGroups) {
      const closingBalanceMinutes =
        previousBalanceMinutes + group.bankHoursMinutes;

      await prisma.timeSummary.upsert({
        where: {
          companyId_employeeId_referenceMonth_referenceYear: {
            companyId,
            employeeId,
            referenceMonth: group.referenceMonth,
            referenceYear: group.referenceYear,
          },
        },
        create: {
          companyId,
          employeeId,
          referenceMonth: group.referenceMonth,
          referenceYear: group.referenceYear,
          workedMinutes: group.workedMinutes,
          overtimeMinutes: group.overtimeMinutes,
          delayMinutes: group.delayMinutes,
          absenceMinutes: group.absenceMinutes,
          bankHoursMinutes: group.bankHoursMinutes,
          previousBalanceMinutes,
          closingBalanceMinutes,
        },
        update: {
          workedMinutes: group.workedMinutes,
          overtimeMinutes: group.overtimeMinutes,
          delayMinutes: group.delayMinutes,
          absenceMinutes: group.absenceMinutes,
          bankHoursMinutes: group.bankHoursMinutes,
          previousBalanceMinutes,
          closingBalanceMinutes,
        },
      });

      previousBalanceMinutes = closingBalanceMinutes;
    }

    const existingSummaries = await prisma.timeSummary.findMany({
      where: {
        companyId,
        employeeId,
      },
      select: {
        id: true,
        referenceYear: true,
        referenceMonth: true,
      },
    });

    const staleSummaryIds = existingSummaries
      .filter(
        (summary) =>
          !keysToKeep.has(`${summary.referenceYear}-${summary.referenceMonth}`)
      )
      .map((summary) => summary.id);

    if (staleSummaryIds.length) {
      await prisma.timeSummary.deleteMany({
        where: {
          id: {
            in: staleSummaryIds,
          },
        },
      });
    }
  }
};

export const createTimeImportPreviewService = async ({
  file,
  companyId,
  importedByUserId,
  source = 'MANUAL',
  notes,
}) => {
  if (!file?.buffer) {
    throw new AppError('Arquivo de importacao nao enviado', 400);
  }

  const parsed = parseTimeImportFile(file.buffer, file.originalname);

  if (!parsed.rows.length) {
    throw new AppError('Nao foi possivel localizar linhas validas no arquivo', 400);
  }

  if (parsed.missingRequiredFields.length) {
    throw new AppError(
      `Colunas obrigatorias nao identificadas: ${parsed.missingRequiredFields.join(', ')}`,
      400
    );
  }

  const [employees, importedKeys] = await Promise.all([
    loadCompanyEmployees(companyId),
    loadImportedKeys(companyId),
  ]);

  const matchEmployee = buildEmployeeMatcher(employees);
  const duplicateCounter = new Map();

  parsed.rows.forEach((row) => {
    const rowKey = getReferenceKey(row);
    duplicateCounter.set(rowKey, (duplicateCounter.get(rowKey) || 0) + 1);
  });

  const duplicateKeys = new Set(
    Array.from(duplicateCounter.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );

  const previewEntries = parsed.rows.map((row) => {
    const matchedEmployee = matchEmployee(row);
    const validation = buildValidationResult(
      row,
      matchedEmployee,
      duplicateKeys,
      importedKeys
    );

    return {
      ...row,
      employeeId: validation.employeeId,
      validationStatus: validation.validationStatus,
      validationErrors: validation.validationErrors,
    };
  });

  const counters = summarizeValidation(previewEntries);
  const period = computeBatchPeriod(previewEntries);

  const batch = await prisma.timeImportBatch.create({
    data: {
      companyId,
      source,
      fileName: `${Date.now()}-${file.originalname}`,
      originalName: file.originalname,
      importedByUserId,
      importedAt: new Date(),
      status: 'PREVIEW',
      totalRows: counters.totalRows,
      validRows: counters.validRows,
      invalidRows: counters.invalidRows,
      pendingRows: counters.pendingRows,
      duplicateRows: counters.duplicateRows,
      recognizedEmployees: counters.recognizedEmployees,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      notes: notes || null,
      mappingJson: parsed.fieldMap,
      entries: {
        create: previewEntries.map((entry) => ({
          companyId,
          employeeId: entry.employeeId,
          employeeNameSnapshot: entry.employeeNameSnapshot,
          employeeDocumentSnapshot: entry.employeeDocumentSnapshot,
          employeeCodeSnapshot: entry.employeeCodeSnapshot,
          workDate: entry.workDate,
          firstEntry: entry.firstEntry,
          firstExit: entry.firstExit,
          secondEntry: entry.secondEntry,
          secondExit: entry.secondExit,
          thirdEntry: entry.thirdEntry,
          thirdExit: entry.thirdExit,
          punchesJson: entry.punchesJson || [],
          workedMinutes: entry.workedMinutes || 0,
          overtimeMinutes: entry.overtimeMinutes || 0,
          delayMinutes: entry.delayMinutes || 0,
          absenceMinutes: entry.absenceMinutes || 0,
          bankHoursMinutes: entry.bankHoursMinutes || 0,
          notes: entry.notes,
          rawJson: entry.rawJson,
          validationStatus: entry.validationStatus,
          validationErrors: entry.validationErrors,
          sourceRowNumber: entry.sourceRowNumber,
        })),
      },
    },
    include: {
      entries: {
        orderBy: [{ sourceRowNumber: 'asc' }, { id: 'asc' }],
        include: VALIDATED_ENTRY_INCLUDE,
      },
    },
  });

  return mapBatchForResponse(batch);
};

export const confirmTimeImportBatchService = async (
  batchId,
  companyId,
  userId
) => {
  const numericBatchId = Number(batchId);

  if (Number.isNaN(numericBatchId)) {
    throw new AppError('Lote de importacao invalido', 400);
  }

  const batch = await prisma.timeImportBatch.findFirst({
    where: {
      id: numericBatchId,
      companyId,
    },
    include: {
      entries: true,
    },
  });

  if (!batch) {
    throw new AppError('Lote de importacao nao encontrado', 404);
  }

  if (!batch.entries.length) {
    throw new AppError('O lote nao possui registros para confirmar', 400);
  }

  const hasAnyProcessableEntry = batch.entries.some((entry) =>
    ['VALIDO', 'PENDENTE_VINCULO'].includes(entry.validationStatus)
  );

  if (!hasAnyProcessableEntry) {
    throw new AppError('Nao ha registros validos para consolidacao neste lote', 400);
  }

  const counters = summarizeValidation(batch.entries);

  const confirmedBatch = await prisma.timeImportBatch.update({
    where: {
      id: numericBatchId,
    },
    data: {
      importedByUserId: userId || batch.importedByUserId,
      confirmedAt: new Date(),
      status: 'IMPORTADO',
      ...counters,
    },
    include: {
      entries: {
        orderBy: [{ sourceRowNumber: 'asc' }, { id: 'asc' }],
        include: VALIDATED_ENTRY_INCLUDE,
      },
    },
  });

  await recomputeTimeSummariesForEmployees(
    companyId,
    confirmedBatch.entries
      .filter((entry) => entry.validationStatus === 'VALIDO')
      .map((entry) => entry.employeeId)
  );

  return mapBatchForResponse(confirmedBatch);
};

export const getTimeImportBatchesService = async (companyId, filters = {}) => {
  const { status, month, year, search } = filters;
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  const where = {
    companyId,
  };

  if (status && status !== 'TODOS') {
    where.status = status;
  }

  if (!Number.isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
    const referenceYear = !Number.isNaN(parsedYear)
      ? parsedYear
      : new Date().getFullYear();
    where.periodStart = {
      gte: new Date(Date.UTC(referenceYear, parsedMonth - 1, 1)),
      lt: new Date(Date.UTC(referenceYear, parsedMonth, 1)),
    };
  } else if (!Number.isNaN(parsedYear)) {
    where.periodStart = {
      gte: new Date(Date.UTC(parsedYear, 0, 1)),
      lt: new Date(Date.UTC(parsedYear + 1, 0, 1)),
    };
  }

  if (search?.trim()) {
    where.OR = [
      {
        originalName: {
          contains: search.trim(),
          mode: 'insensitive',
        },
      },
      {
        notes: {
          contains: search.trim(),
          mode: 'insensitive',
        },
      },
    ];
  }

  const batches = await prisma.timeImportBatch.findMany({
    where,
    include: {
      importedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          entries: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const summary = {
    totalBatches: batches.length,
    importedBatches: batches.filter((batch) => batch.status === 'IMPORTADO').length,
    previewBatches: batches.filter((batch) => batch.status === 'PREVIEW').length,
    pendingRows: batches.reduce((acc, batch) => acc + (batch.pendingRows || 0), 0),
    invalidRows: batches.reduce((acc, batch) => acc + (batch.invalidRows || 0), 0),
    lastImportAt: batches[0]?.createdAt || null,
  };

  return {
    batches,
    summary,
  };
};

export const getTimeImportBatchByIdService = async (batchId, companyId) => {
  const numericBatchId = Number(batchId);

  if (Number.isNaN(numericBatchId)) {
    throw new AppError('Lote de importacao invalido', 400);
  }

  const batch = await prisma.timeImportBatch.findFirst({
    where: {
      id: numericBatchId,
      companyId,
    },
    include: {
      importedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      entries: {
        include: VALIDATED_ENTRY_INCLUDE,
        orderBy: [{ sourceRowNumber: 'asc' }, { id: 'asc' }],
      },
    },
  });

  if (!batch) {
    throw new AppError('Lote de importacao nao encontrado', 404);
  }

  return mapBatchForResponse(batch);
};

export const resolveTimeEntryEmployeeService = async ({
  batchId,
  entryId,
  employeeId,
  companyId,
}) => {
  const numericBatchId = Number(batchId);
  const numericEntryId = Number(entryId);
  const numericEmployeeId = Number(employeeId);

  if ([numericBatchId, numericEntryId, numericEmployeeId].some(Number.isNaN)) {
    throw new AppError('Parametros de vinculo invalidos', 400);
  }

  const [entry, employee] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: {
        id: numericEntryId,
        importBatchId: numericBatchId,
        companyId,
      },
      include: {
        importBatch: true,
      },
    }),
    prisma.employee.findFirst({
      where: {
        id: numericEmployeeId,
        ...buildEmployeeWhere(companyId),
      },
    }),
  ]);

  if (!entry) {
    throw new AppError('Registro de jornada nao encontrado', 404);
  }

  if (!employee) {
    throw new AppError('Colaborador nao encontrado para este contexto', 404);
  }

  const duplicateInImported = await prisma.timeEntry.findFirst({
    where: {
      companyId,
      employeeId: numericEmployeeId,
      workDate: entry.workDate,
      id: {
        not: numericEntryId,
      },
      importBatch: {
        status: 'IMPORTADO',
      },
    },
  });

  const validationErrors = [];

  if (duplicateInImported) {
    validationErrors.push(
      'Ja existe outro registro importado para este colaborador nesta data'
    );
  }

  const updatedEntry = await prisma.timeEntry.update({
    where: {
      id: numericEntryId,
    },
    data: {
      employeeId: numericEmployeeId,
      validationStatus: validationErrors.length ? 'DUPLICADO' : 'VALIDO',
      validationErrors,
    },
    include: VALIDATED_ENTRY_INCLUDE,
  });

  const batchEntries = await prisma.timeEntry.findMany({
    where: {
      importBatchId: numericBatchId,
    },
  });

  const counters = summarizeValidation(batchEntries.map((currentEntry) => {
    if (currentEntry.id === updatedEntry.id) {
      return updatedEntry;
    }

    return currentEntry;
  }));

  await prisma.timeImportBatch.update({
    where: {
      id: numericBatchId,
    },
    data: {
      ...counters,
    },
  });

  if (entry.importBatch?.status === 'IMPORTADO' && !validationErrors.length) {
    await recomputeTimeSummariesForEmployees(companyId, [numericEmployeeId]);
  }

  return updatedEntry;
};

export const getTimeSummaryService = async (companyId, filters = {}) => {
  const now = new Date();
  const parsedMonth = Number(filters.month || now.getMonth() + 1);
  const parsedYear = Number(filters.year || now.getFullYear());
  const department = String(filters.department || 'TODOS');
  const search = String(filters.search || '').trim();
  const employeeFilter = {};

  if (search) {
    employeeFilter.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (department !== 'TODOS') {
    employeeFilter.employeeCompanies = {
      some: {
        companyId,
        department,
      },
    };
  }

  const summaries = await prisma.timeSummary.findMany({
    where: {
      companyId,
      referenceMonth: parsedMonth,
      referenceYear: parsedYear,
      ...(Object.keys(employeeFilter).length
        ? {
            employee: employeeFilter,
          }
        : {}),
    },
    include: {
      employee: {
        include: {
          employeeCompanies: {
            where: { companyId },
            select: {
              department: true,
              role: true,
              registrationNumber: true,
            },
          },
        },
      },
    },
    orderBy: {
      employee: {
        name: 'asc',
      },
    },
  });

  const batches = await prisma.timeImportBatch.findMany({
    where: {
      companyId,
      OR: [
        {
          periodStart: {
            gte: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)),
            lt: new Date(Date.UTC(parsedYear, parsedMonth, 1)),
          },
        },
        {
          periodEnd: {
            gte: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)),
            lt: new Date(Date.UTC(parsedYear, parsedMonth, 1)),
          },
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const mappedSummaries = summaries.map((summary) => {
    const primaryCompanyData = summary.employee.employeeCompanies?.[0];

    return {
      id: summary.id,
      employeeId: summary.employeeId,
      employeeName: summary.employee.name,
      employeeCpf: summary.employee.cpf,
      department: primaryCompanyData?.department || summary.employee.department || '-',
      role: primaryCompanyData?.role || summary.employee.role || '-',
      workedMinutes: summary.workedMinutes,
      overtimeMinutes: summary.overtimeMinutes,
      delayMinutes: summary.delayMinutes,
      absenceMinutes: summary.absenceMinutes,
      bankHoursMinutes: summary.bankHoursMinutes,
      previousBalanceMinutes: summary.previousBalanceMinutes,
      closingBalanceMinutes: summary.closingBalanceMinutes,
      referenceMonth: summary.referenceMonth,
      referenceYear: summary.referenceYear,
    };
  });

  const summary = {
    totalEmployees: mappedSummaries.length,
    totalWorkedMinutes: mappedSummaries.reduce(
      (acc, item) => acc + item.workedMinutes,
      0
    ),
    totalOvertimeMinutes: mappedSummaries.reduce(
      (acc, item) => acc + item.overtimeMinutes,
      0
    ),
    totalDelayMinutes: mappedSummaries.reduce(
      (acc, item) => acc + item.delayMinutes,
      0
    ),
    totalAbsenceMinutes: mappedSummaries.reduce(
      (acc, item) => acc + item.absenceMinutes,
      0
    ),
    totalBankHoursMinutes: mappedSummaries.reduce(
      (acc, item) => acc + item.bankHoursMinutes,
      0
    ),
    pendingLinks: batches.reduce((acc, batch) => acc + (batch.pendingRows || 0), 0),
    recognizedEmployees: batches.reduce(
      (acc, batch) => acc + (batch.recognizedEmployees || 0),
      0
    ),
    importedRows: batches.reduce((acc, batch) => acc + (batch.totalRows || 0), 0),
    lastImportAt: batches[0]?.createdAt || null,
  };

  const payrollRun = await prisma.payrollRun.findFirst({
    where: {
      companyId,
      month: parsedMonth,
      year: parsedYear,
    },
    include: {
      movements: {
        where: {
          source: 'IMPORTADO',
          autoGenerated: true,
          isActive: true,
          sourceReference: {
            startsWith: 'time-summary:',
          },
        },
      },
    },
  });
  const payrollSync = payrollRun
    ? {
        payrollRunId: payrollRun.id,
        referenceLabel: payrollRun.referenceLabel,
        status: payrollRun.movements.length > 0 ? 'SYNCED' : 'READY',
        payrollRunStatus: payrollRun.status,
        generatedMovements: payrollRun.movements.length,
        lastSyncAt:
          payrollRun.movements
            .map((movement) => movement.createdAt)
            .sort((left, right) => new Date(right) - new Date(left))[0] || null,
      }
    : {
        payrollRunId: null,
        referenceLabel: null,
        status: 'NO_PAYROLL_RUN',
        payrollRunStatus: null,
        generatedMovements: 0,
        lastSyncAt: null,
      };

  return {
    summaries: mappedSummaries,
    summary,
    payrollSync,
  };
};

export const getBankHoursService = async (companyId, filters = {}) => {
  const now = new Date();
  const parsedMonth = Number(filters.month || now.getMonth() + 1);
  const parsedYear = Number(filters.year || now.getFullYear());
  const department = String(filters.department || 'TODOS');
  const search = String(filters.search || '').trim();
  const employeeFilter = {};

  if (search) {
    employeeFilter.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (department !== 'TODOS') {
    employeeFilter.employeeCompanies = {
      some: {
        companyId,
        department,
      },
    };
  }

  const where = {
    companyId,
    referenceMonth: parsedMonth,
    referenceYear: parsedYear,
    ...(Object.keys(employeeFilter).length
      ? {
          employee: employeeFilter,
        }
      : {}),
  };

  const summaries = await prisma.timeSummary.findMany({
    where,
    include: {
      employee: {
        include: {
          employeeCompanies: {
            where: { companyId },
            select: {
              department: true,
              role: true,
              registrationNumber: true,
            },
          },
        },
      },
    },
    orderBy: {
      closingBalanceMinutes: 'desc',
    },
  });

  const balances = summaries.map((summary) => {
    const primaryCompanyData = summary.employee.employeeCompanies?.[0];
    const creditsMinutes = Math.max(summary.bankHoursMinutes, 0);
    const debitsMinutes = Math.abs(Math.min(summary.bankHoursMinutes, 0));

    return {
      id: summary.id,
      employeeId: summary.employeeId,
      employeeName: summary.employee.name,
      department: primaryCompanyData?.department || summary.employee.department || '-',
      role: primaryCompanyData?.role || summary.employee.role || '-',
      previousBalanceMinutes: summary.previousBalanceMinutes,
      creditsMinutes,
      debitsMinutes,
      movementMinutes: summary.bankHoursMinutes,
      closingBalanceMinutes: summary.closingBalanceMinutes,
      overtimeMinutes: summary.overtimeMinutes,
      absenceMinutes: summary.absenceMinutes,
      delayMinutes: summary.delayMinutes,
      referenceMonth: summary.referenceMonth,
      referenceYear: summary.referenceYear,
    };
  });

  const summary = {
    totalEmployees: balances.length,
    totalCreditsMinutes: balances.reduce(
      (acc, item) => acc + item.creditsMinutes,
      0
    ),
    totalDebitsMinutes: balances.reduce(
      (acc, item) => acc + item.debitsMinutes,
      0
    ),
    totalClosingBalanceMinutes: balances.reduce(
      (acc, item) => acc + item.closingBalanceMinutes,
      0
    ),
    positiveBalances: balances.filter((item) => item.closingBalanceMinutes > 0).length,
    negativeBalances: balances.filter((item) => item.closingBalanceMinutes < 0).length,
  };

  return {
    balances,
    summary,
  };
};

export const getTimeTrackingOptionsService = async (companyId) => {
  const employees = await prisma.employee.findMany({
    where: buildEmployeeWhere(companyId),
    include: {
      employeeCompanies: {
        where: { companyId },
        select: {
          department: true,
          role: true,
          registrationNumber: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const departments = [
    ...new Set(
      employees
        .map(
          (employee) =>
            employee.employeeCompanies?.[0]?.department || employee.department || ''
        )
        .filter(Boolean)
    ),
  ].sort((left, right) => left.localeCompare(right));

  return {
    sources: [
      { value: 'MYAHGORA', label: 'MyAhgora / TOTVS' },
      { value: 'TOTVS', label: 'TOTVS' },
      { value: 'MANUAL', label: 'Manual / Outro formato' },
    ],
    employees: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      cpf: employee.cpf,
      department:
        employee.employeeCompanies?.[0]?.department || employee.department || '-',
      role: employee.employeeCompanies?.[0]?.role || employee.role || '-',
      registrationNumber:
        employee.employeeCompanies?.[0]?.registrationNumber || '',
    })),
    departments,
  };
};
