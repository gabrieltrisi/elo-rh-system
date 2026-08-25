import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { createAuditLog } from '../../services/auditService.js';

const DEFAULT_TIME_PAYROLL_RULES = [
  {
    sourceType: 'OVERTIME_50',
    eventCode: 'HORA_EXTRA_50',
    conversionMode: 'HOURS_TO_EVENT',
    factor: 1,
    notes: 'Converte horas extras consolidadas da jornada em provento de Hora Extra 50%.',
  },
  {
    sourceType: 'OVERTIME_100',
    eventCode: 'HORA_EXTRA_100',
    conversionMode: 'HOURS_TO_EVENT',
    factor: 1,
    notes: 'Base preparada para horas extras 100% quando houver separacao no arquivo de jornada.',
  },
  {
    sourceType: 'ABSENCE',
    eventCode: 'FALTA',
    conversionMode: 'HOURS_TO_EVENT',
    factor: 1,
    notes: 'Converte faltas em desconto com base no valor hora estimado.',
  },
  {
    sourceType: 'DELAY',
    eventCode: 'ATRASO',
    conversionMode: 'HOURS_TO_EVENT',
    factor: 1,
    notes: 'Converte atrasos em desconto com base no valor hora estimado.',
  },
  {
    sourceType: 'BANK_HOURS',
    eventCode: 'BANCO_HORAS',
    conversionMode: 'INFORMATIVE',
    factor: 1,
    notes: 'Registra saldo de banco de horas como informativo sem reflexo financeiro automatico.',
  },
];

const REQUIRED_TIME_EVENTS = [
  {
    code: 'HORA_EXTRA_100',
    name: 'Hora Extra 100%',
    category: 'HORAS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Evento variavel preparado para remuneracao de horas extras 100%.',
  },
  {
    code: 'ATRASO',
    name: 'Atraso',
    category: 'DESCONTOS',
    type: 'DESCONTO',
    calculationType: 'MANUAL',
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Desconto aplicado por atrasos consolidados na jornada.',
  },
  {
    code: 'BANCO_HORAS',
    name: 'Banco de Horas',
    category: 'INFORMATIVOS',
    type: 'INFORMATIVO',
    calculationType: 'MANUAL',
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Evento informativo para saldo de banco de horas da jornada.',
  },
];

const minutesToHours = (minutes) => Number((Number(minutes || 0) / 60).toFixed(2));

const getEstimatedHourlyRate = (runEmployee) => {
  const salary = Number(runEmployee?.salaryBaseSnapshot || 0);
  if (!salary) return 0;
  return Number((salary / 220).toFixed(2));
};

const getReference = (summaryId, sourceType) =>
  `time-summary:${summaryId}:${sourceType}`;

const ensureTimePayrollBase = async (companyId) => {
  for (const event of REQUIRED_TIME_EVENTS) {
    await prisma.payrollEvent.upsert({
      where: {
        companyId_code: {
          companyId: Number(companyId),
          code: event.code,
        },
      },
      update: {
        name: event.name,
        category: event.category,
        type: event.type,
        calculationType: event.calculationType,
        defaultQuantity: event.defaultQuantity,
        defaultUnitValue: event.defaultUnitValue,
        incidenceINSS: event.incidenceINSS,
        incidenceFGTS: event.incidenceFGTS,
        incidenceIRRF: event.incidenceIRRF,
        isFixed: event.isFixed,
        isVariable: event.isVariable,
        isSystem: event.isSystem,
        isActive: true,
        description: event.description,
      },
      create: {
        companyId: Number(companyId),
        ...event,
        isActive: true,
      },
    });
  }

  const events = await prisma.payrollEvent.findMany({
    where: {
      companyId: Number(companyId),
      code: {
        in: DEFAULT_TIME_PAYROLL_RULES.map((rule) => rule.eventCode),
      },
    },
  });
  const eventByCode = new Map(events.map((event) => [event.code, event]));

  for (const rule of DEFAULT_TIME_PAYROLL_RULES) {
    const payrollEvent = eventByCode.get(rule.eventCode);
    if (!payrollEvent) continue;

    await prisma.timePayrollMapping.upsert({
      where: {
        companyId_sourceType: {
          companyId: Number(companyId),
          sourceType: rule.sourceType,
        },
      },
      update: {
        payrollEventId: payrollEvent.id,
        conversionMode: rule.conversionMode,
        factor: rule.factor,
        notes: rule.notes,
      },
      create: {
        companyId: Number(companyId),
        sourceType: rule.sourceType,
        payrollEventId: payrollEvent.id,
        conversionMode: rule.conversionMode,
        factor: rule.factor,
        isActive: true,
        notes: rule.notes,
      },
    });
  }
};

const loadPayrollRun = async (runId, companyId) => {
  const run = await prisma.payrollRun.findFirst({
    where: {
      id: Number(runId),
      companyId: Number(companyId),
    },
    include: {
      employees: true,
      movements: {
        where: {
          isActive: true,
        },
      },
    },
  });

  if (!run) {
    throw new AppError('Competencia da folha nao encontrada', 404);
  }

  return run;
};

const ensureRunAcceptsTimeSync = (run) => {
  if (run.status === 'FECHADA') {
    throw new AppError(
      'Nao e permitido sincronizar Jornada em competencia fechada. Reabra a competencia antes de continuar.',
      400
    );
  }
};

const buildMovementCandidate = ({ summary, runEmployee, mapping }) => {
  const hourlyRate = getEstimatedHourlyRate(runEmployee);
  const sourceType = mapping.sourceType;
  let minutes = 0;
  let unitValue = Number(mapping.payrollEvent.defaultUnitValue || mapping.payrollEvent.defaultValue || 0);

  if (sourceType === 'OVERTIME_50') {
    minutes = Math.max(Number(summary.overtimeMinutes || 0), 0);
    unitValue = unitValue || Number((hourlyRate * 1.5).toFixed(2));
  }

  if (sourceType === 'OVERTIME_100') {
    minutes = 0;
    unitValue = unitValue || Number((hourlyRate * 2).toFixed(2));
  }

  if (sourceType === 'ABSENCE') {
    minutes = Math.max(Number(summary.absenceMinutes || 0), 0);
    unitValue = unitValue || hourlyRate;
  }

  if (sourceType === 'DELAY') {
    minutes = Math.max(Number(summary.delayMinutes || 0), 0);
    unitValue = unitValue || hourlyRate;
  }

  if (sourceType === 'BANK_HOURS') {
    minutes = Number(summary.bankHoursMinutes || 0);
    unitValue = 0;
  }

  if (!minutes) return null;

  const quantity = minutesToHours(Math.abs(minutes)) * Number(mapping.factor || 1);
  const totalValue =
    mapping.conversionMode === 'INFORMATIVE'
      ? 0
      : Number((quantity * unitValue).toFixed(2));

  return {
    payrollRunId: runEmployee.payrollRunId,
    employeeId: summary.employeeId,
    payrollEventId: mapping.payrollEventId,
    type: mapping.payrollEvent.type,
    source: 'IMPORTADO',
    eventCode: mapping.payrollEvent.code,
    eventName: mapping.payrollEvent.name,
    eventCategory: mapping.payrollEvent.category,
    quantity,
    unitValue,
    totalValue,
    notes: `Gerado automaticamente pela Jornada (${summary.referenceMonth}/${summary.referenceYear}).`,
    sourceType,
    sourceReference: getReference(summary.id, sourceType),
    autoGenerated: true,
    metadataJson: {
      origin: 'time_tracking',
      timeSummaryId: summary.id,
      referenceMonth: summary.referenceMonth,
      referenceYear: summary.referenceYear,
      minutes,
      conversionMode: mapping.conversionMode,
      factor: mapping.factor,
      hourlyRate,
    },
  };
};

export const getTimePayrollSyncPreviewService = async (runId, companyId) => {
  await ensureTimePayrollBase(companyId);
  const run = await loadPayrollRun(runId, companyId);
  const summaries = await prisma.timeSummary.findMany({
    where: {
      companyId: Number(companyId),
      referenceMonth: run.month,
      referenceYear: run.year,
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: true,
          role: true,
        },
      },
    },
    orderBy: {
      employee: {
        name: 'asc',
      },
    },
  });
  const runEmployeeByEmployeeId = new Map(
    run.employees.map((entry) => [entry.employeeId, entry])
  );
  const mappings = await prisma.timePayrollMapping.findMany({
    where: {
      companyId: Number(companyId),
      isActive: true,
    },
    include: {
      payrollEvent: true,
    },
    orderBy: {
      sourceType: 'asc',
    },
  });
  const candidates = [];
  const skipped = [];

  summaries.forEach((summary) => {
    const runEmployee = runEmployeeByEmployeeId.get(summary.employeeId);

    if (!runEmployee) {
      skipped.push({
        employeeId: summary.employeeId,
        employeeName: summary.employee?.name || 'Colaborador',
        reason: 'Colaborador nao esta elegivel nesta competencia',
      });
      return;
    }

    mappings.forEach((mapping) => {
      const candidate = buildMovementCandidate({ summary, runEmployee, mapping });
      if (candidate) {
        candidates.push({
          ...candidate,
          employeeName: summary.employee?.name || 'Colaborador',
        });
      }
    });
  });

  const existingAutoMovements = run.movements.filter(
    (movement) => movement.autoGenerated && movement.source === 'IMPORTADO'
  );

  return {
    payrollRunId: run.id,
    referenceLabel: run.referenceLabel,
    status: run.status,
    canSync: run.status !== 'FECHADA',
    summary: {
      employeesWithTimeData: summaries.length,
      affectedEmployees: new Set(candidates.map((item) => item.employeeId)).size,
      generatedMovements: candidates.length,
      existingAutoMovements: existingAutoMovements.length,
      skippedEmployees: skipped.length,
      totalOvertimeHours: Number(
        candidates
          .filter((item) => item.sourceType === 'OVERTIME_50')
          .reduce((acc, item) => acc + item.quantity, 0)
          .toFixed(2)
      ),
      totalAbsenceHours: Number(
        candidates
          .filter((item) => item.sourceType === 'ABSENCE')
          .reduce((acc, item) => acc + item.quantity, 0)
          .toFixed(2)
      ),
      totalDelayHours: Number(
        candidates
          .filter((item) => item.sourceType === 'DELAY')
          .reduce((acc, item) => acc + item.quantity, 0)
          .toFixed(2)
      ),
      totalBankHours: Number(
        candidates
          .filter((item) => item.sourceType === 'BANK_HOURS')
          .reduce((acc, item) => acc + item.quantity, 0)
          .toFixed(2)
      ),
    },
    candidates,
    skipped,
    mappings: mappings.map((mapping) => ({
      id: mapping.id,
      sourceType: mapping.sourceType,
      conversionMode: mapping.conversionMode,
      factor: mapping.factor,
      isActive: mapping.isActive,
      payrollEvent: {
        id: mapping.payrollEvent.id,
        code: mapping.payrollEvent.code,
        name: mapping.payrollEvent.name,
        type: mapping.payrollEvent.type,
      },
    })),
  };
};

export const syncTimeToPayrollRunService = async ({
  runId,
  companyId,
  userId,
  req,
}) => {
  const preview = await getTimePayrollSyncPreviewService(runId, companyId);
  const run = await loadPayrollRun(runId, companyId);
  ensureRunAcceptsTimeSync(run);

  if (!preview.candidates.length) {
    throw new AppError(
      'Nao ha dados consolidados da Jornada com reflexo nesta competencia',
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const disabled = await tx.payrollMovement.updateMany({
      where: {
        payrollRunId: Number(runId),
        source: 'IMPORTADO',
        autoGenerated: true,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedByUserId: userId ? Number(userId) : null,
      },
    });

    const createdMovements = [];

    for (const candidate of preview.candidates) {
      const created = await tx.payrollMovement.create({
        data: {
          payrollRunId: Number(runId),
          employeeId: candidate.employeeId,
          payrollEventId: candidate.payrollEventId,
          type: candidate.type,
          source: candidate.source,
          eventCode: candidate.eventCode,
          eventName: candidate.eventName,
          eventCategory: candidate.eventCategory,
          quantity: candidate.quantity,
          unitValue: candidate.unitValue,
          totalValue: candidate.totalValue,
          notes: candidate.notes,
          sourceType: candidate.sourceType,
          sourceReference: candidate.sourceReference,
          autoGenerated: true,
          metadataJson: candidate.metadataJson,
          createdByUserId: userId ? Number(userId) : null,
          updatedByUserId: userId ? Number(userId) : null,
        },
      });

      createdMovements.push(created);
    }

    return {
      disabledAutoMovements: disabled.count,
      createdMovements,
    };
  });

  await createAuditLog({
    req,
    companyId,
    module: 'payroll',
    entityType: 'time_payroll_sync',
    entityId: run.id,
    action: 'PROCESS',
    severity: 'CRITICAL',
    summary: `Jornada sincronizada com a folha ${run.referenceLabel}`,
    details: {
      payrollRunId: run.id,
      referenceLabel: run.referenceLabel,
      createdMovements: result.createdMovements.length,
      disabledAutoMovements: result.disabledAutoMovements,
      affectedEmployees: preview.summary.affectedEmployees,
      totals: preview.summary,
    },
  });

  return {
    ...preview,
    status: 'SYNCED',
    summary: {
      ...preview.summary,
      createdMovements: result.createdMovements.length,
      replacedAutoMovements: result.disabledAutoMovements,
    },
  };
};
