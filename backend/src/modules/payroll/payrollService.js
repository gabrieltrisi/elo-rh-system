import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { ensureDefaultCompaniesService } from '../../services/companyService.js';

const ACTIVE_EMPLOYEE_STATUSES = ['ativo', 'ATIVO', 'Ativo'];
const EMPLOYER_INSS_RATE = 0.2;
const FGTS_RATE = 0.08;
const IRRF_ESTIMATED_RATE = 0.075;

const DEFAULT_PAYROLL_EVENTS = [
  {
    code: 'SALARIO_BASE',
    name: 'Salario Base',
    category: 'SALARIO',
    type: 'PROVENTO',
    calculationType: 'FIXO',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: true,
    isVariable: false,
    isSystem: true,
    description: 'Evento base para remuneracao mensal do colaborador.',
  },
  {
    code: 'HORA_EXTRA_50',
    name: 'Hora Extra 50%',
    category: 'HORAS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Evento variavel para remuneracao de horas extras 50%.',
  },
  {
    code: 'HORA_EXTRA_100',
    name: 'Hora Extra 100%',
    category: 'HORAS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Evento variavel para remuneracao de horas extras 100%.',
  },
  {
    code: 'BONUS',
    name: 'Bonus',
    category: 'VARIAVEIS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Bonus eventual aplicado ao colaborador na competencia.',
  },
  {
    code: 'COMISSAO',
    name: 'Comissao',
    category: 'VARIAVEIS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Comissao variavel vinculada ao desempenho ou vendas.',
  },
  {
    code: 'ADICIONAL',
    name: 'Adicional',
    category: 'ADICIONAIS',
    type: 'PROVENTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: true,
    incidenceFGTS: true,
    incidenceIRRF: true,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Adicional eventual ou recorrente com incidencia integral.',
  },
  {
    code: 'FALTA',
    name: 'Falta',
    category: 'DESCONTOS',
    type: 'DESCONTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Desconto aplicado por falta ou ausencia nao compensada.',
  },
  {
    code: 'ATRASO',
    name: 'Atraso',
    category: 'DESCONTOS',
    type: 'DESCONTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Desconto aplicado por atraso consolidado na jornada.',
  },
  {
    code: 'DESCONTO_MANUAL',
    name: 'Desconto Manual',
    category: 'DESCONTOS',
    type: 'DESCONTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Desconto manual para ajustes gerais da competencia.',
  },
  {
    code: 'VALE',
    name: 'Vale',
    category: 'ADIANTAMENTOS',
    type: 'DESCONTO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Desconto de vale ou adiantamento concedido ao colaborador.',
  },
  {
    code: 'AJUSTE_INFORMATIVO',
    name: 'Ajuste Informativo',
    category: 'INFORMATIVOS',
    type: 'INFORMATIVO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Rubrica informativa para observacoes e demonstrativos internos.',
  },
  {
    code: 'BANCO_HORAS',
    name: 'Banco de Horas',
    category: 'INFORMATIVOS',
    type: 'INFORMATIVO',
    calculationType: 'MANUAL',
    defaultValue: 0,
    defaultQuantity: 1,
    defaultUnitValue: 0,
    incidenceINSS: false,
    incidenceFGTS: false,
    incidenceIRRF: false,
    isFixed: false,
    isVariable: true,
    isSystem: true,
    description: 'Rubrica informativa para saldo de banco de horas vindo da jornada.',
  },
];

const payrollRunInclude = {
  company: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  employees: {
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
          employeeCompanies: {
            include: {
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
    },
    orderBy: {
      employee: {
        name: 'asc',
      },
    },
  },
  movements: {
    where: {
      isActive: true,
    },
    include: {
      payrollEvent: true,
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  },
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizePositiveNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;

  const normalized = Number(value);

  if (Number.isNaN(normalized)) {
    throw new AppError('Valor numerico invalido informado para a folha', 400);
  }

  return normalized;
};

const normalizeMonth = (value) => {
  const month = Number(value);

  if (Number.isNaN(month) || month < 1 || month > 12) {
    throw new AppError('Mes da competencia invalido', 400);
  }

  return month;
};

const normalizeYear = (value) => {
  const year = Number(value);

  if (Number.isNaN(year) || year < 2020 || year > 2100) {
    throw new AppError('Ano da competencia invalido', 400);
  }

  return year;
};

const normalizeMovementType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  const allowed = ['PROVENTO', 'DESCONTO', 'INFORMATIVO'];

  if (!allowed.includes(normalized)) {
    throw new AppError('Tipo de evento da folha invalido', 400);
  }

  return normalized;
};

const normalizeCalculationType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  const allowed = ['FIXO', 'PERCENTUAL', 'FORMULA', 'MANUAL'];

  if (!allowed.includes(normalized)) {
    throw new AppError('Tipo de calculo do evento invalido', 400);
  }

  return normalized;
};

const normalizeMovementSource = (value) => {
  const normalized = String(value || 'MANUAL').trim().toUpperCase();
  const allowed = ['MANUAL', 'AUTOMATICO', 'FIXO', 'IMPORTADO'];

  if (!allowed.includes(normalized)) {
    throw new AppError('Origem do lancamento invalida', 400);
  }

  return normalized;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'sim', 'yes'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const buildReferenceLabel = (month, year) =>
  `${String(month).padStart(2, '0')}/${year}`;

const getCompetenceEndDate = (month, year) =>
  new Date(year, month, 0, 23, 59, 59, 999);

const ensurePayrollBaseStructure = async (companyId) => {
  await ensureDefaultCompaniesService();

  for (const event of DEFAULT_PAYROLL_EVENTS) {
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
        defaultValue: event.defaultValue,
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
        code: event.code,
        name: event.name,
        category: event.category,
        type: event.type,
        calculationType: event.calculationType,
        defaultValue: event.defaultValue,
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
    });
  }
};

const ensureRunEditable = (run, actionLabel = 'alterar a competencia') => {
  if (!run) {
    throw new AppError('Competencia nao encontrada', 404);
  }

  if (run.status === 'FECHADA') {
    throw new AppError(
      `Nao e permitido ${actionLabel} enquanto a competencia estiver fechada`,
      400
    );
  }
};

const ensureCompanyScopedRun = async (runId, companyId) => {
  const run = await prisma.payrollRun.findFirst({
    where: {
      id: Number(runId),
      companyId: Number(companyId),
    },
    include: payrollRunInclude,
  });

  if (!run) {
    throw new AppError('Competencia nao encontrada', 404);
  }

  return run;
};

const ensureCompanyScopedEvent = async (eventId, companyId) => {
  const payrollEvent = await prisma.payrollEvent.findFirst({
    where: {
      id: Number(eventId),
      companyId: Number(companyId),
    },
  });

  if (!payrollEvent) {
    throw new AppError('Evento da folha nao encontrado', 404);
  }

  return payrollEvent;
};

const selectEmployeeCompanyLink = (employee, companyId) => {
  const links = Array.isArray(employee.employeeCompanies)
    ? employee.employeeCompanies
    : [];

  const matchedLink = links.find(
    (link) => Number(link.companyId) === Number(companyId)
  );

  if (matchedLink) {
    return matchedLink;
  }

  if (Number(employee.companyId) === Number(companyId)) {
    return {
      companyId: Number(companyId),
      role: employee.role,
      department: employee.department,
      admissionDate: employee.admissionDate,
      status: employee.status,
      contractType: employee.contractType,
      salaryBase: null,
      registrationNumber: null,
      notes: employee.notes,
      isPrimary: true,
      company: null,
    };
  }

  return null;
};

const serializePayrollEvent = (event) => ({
  id: event.id,
  companyId: event.companyId,
  code: event.code,
  name: event.name,
  description: event.description || '',
  category: event.category || '',
  type: event.type,
  calculationType: event.calculationType || 'MANUAL',
  defaultValue: Number(event.defaultValue || 0),
  defaultQuantity: Number(event.defaultQuantity || 0),
  defaultUnitValue: Number(event.defaultUnitValue || 0),
  incidenceINSS: Boolean(event.incidenceINSS),
  incidenceFGTS: Boolean(event.incidenceFGTS),
  incidenceIRRF: Boolean(event.incidenceIRRF),
  isFixed: Boolean(event.isFixed),
  isVariable: Boolean(event.isVariable),
  isSystem: Boolean(event.isSystem),
  isActive: Boolean(event.isActive),
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});

const serializeMovement = (movement) => ({
  id: movement.id,
  payrollRunId: movement.payrollRunId,
  employeeId: movement.employeeId,
  payrollEventId: movement.payrollEventId,
  type: movement.type,
  source: movement.source,
  eventCode: movement.eventCode,
  eventName: movement.eventName,
  eventCategory: movement.eventCategory,
  quantity: Number(movement.quantity || 0),
  unitValue: Number(movement.unitValue || 0),
  totalValue: Number(movement.totalValue || 0),
  notes: movement.notes || '',
  sourceType: movement.sourceType || null,
  sourceReference: movement.sourceReference || null,
  autoGenerated: Boolean(movement.autoGenerated),
  metadataJson: movement.metadataJson || null,
  isActive: Boolean(movement.isActive),
  createdAt: movement.createdAt,
  updatedAt: movement.updatedAt,
});

const calculateChargeBases = (lines) => {
  const inssBase = lines
    .filter((line) => line.incidenceINSS)
    .reduce((total, line) => total + Number(line.totalValue || 0), 0);

  const fgtsBase = lines
    .filter((line) => line.incidenceFGTS)
    .reduce((total, line) => total + Number(line.totalValue || 0), 0);

  const irrfBase = lines
    .filter((line) => line.incidenceIRRF)
    .reduce((total, line) => total + Number(line.totalValue || 0), 0);

  const inssAmount = inssBase * EMPLOYER_INSS_RATE;
  const fgtsAmount = fgtsBase * FGTS_RATE;
  const irrfEstimatedAmount = irrfBase * IRRF_ESTIMATED_RATE;

  return {
    inssBase,
    fgtsBase,
    irrfBase,
    inssAmount,
    fgtsAmount,
    irrfEstimatedAmount,
    totalCharges: inssAmount + fgtsAmount + irrfEstimatedAmount,
  };
};

const serializeRunEmployee = (entry, movements = []) => ({
  id: entry.id,
  payrollRunId: entry.payrollRunId,
  employeeId: entry.employeeId,
  employeeName: entry.employee?.name || 'Colaborador',
  employeeEmail: entry.employee?.email || '',
  employeeCpf: entry.employee?.cpf || '',
  role: entry.roleSnapshot || '',
  department: entry.departmentSnapshot || '',
  admissionDate: entry.admissionDateSnapshot,
  salaryBase: Number(entry.salaryBaseSnapshot || 0),
  status: entry.status,
  grossAmount: Number(entry.grossAmount || 0),
  discountAmount: Number(entry.discountAmount || 0),
  netAmount: Number(entry.netAmount || 0),
  chargesAmount: Number(entry.chargesAmount || 0),
  processedAt: entry.processedAt,
  hasInconsistency: Boolean(entry.hasInconsistency),
  inconsistencyNotes: entry.inconsistencyNotes || '',
  movementCount: movements.length,
  movements: movements.map(serializeMovement),
  breakdown: entry.breakdown || null,
});

const serializeRun = (run) => {
  const movementMap = new Map();

  for (const movement of run.movements || []) {
    const current = movementMap.get(movement.employeeId) || [];
    current.push(movement);
    movementMap.set(movement.employeeId, current);
  }

  const employees = (run.employees || []).map((entry) =>
    serializeRunEmployee(entry, movementMap.get(entry.employeeId) || [])
  );

  return {
    id: run.id,
    companyId: run.companyId,
    companyName: run.company?.name || '',
    companyCode: run.company?.code || '',
    month: run.month,
    year: run.year,
    referenceLabel: run.referenceLabel,
    status: run.status,
    startedAt: run.startedAt,
    processedAt: run.processedAt,
    closedAt: run.closedAt,
    reopenedAt: run.reopenedAt,
    notes: run.notes || '',
    totalEmployees: run.totalEmployees,
    totalGross: Number(run.totalGross || 0),
    totalDiscounts: Number(run.totalDiscounts || 0),
    totalNet: Number(run.totalNet || 0),
    totalCharges: Number(run.totalCharges || 0),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    employees,
    processedEmployees: employees.filter(
      (entry) => entry.status === 'PROCESSADO'
    ).length,
    inconsistencyCount: employees.filter((entry) => entry.hasInconsistency)
      .length,
    canProcess: ['ABERTA', 'REABERTA', 'PROCESSADA'].includes(run.status),
    canClose: run.status === 'PROCESSADA',
    canReopen: run.status === 'FECHADA',
  };
};

const buildPayslipFromEntry = (run, entry) => {
  if (!entry.breakdown) {
    throw new AppError(
      'Esta competencia ainda nao possui preview disponivel para este colaborador',
      400
    );
  }

  const lines = Array.isArray(entry.breakdown.lines) ? entry.breakdown.lines : [];
  const provents = lines.filter((line) => line.type === 'PROVENTO');
  const discounts = lines.filter((line) => line.type === 'DESCONTO');
  const informative = lines.filter((line) => line.type === 'INFORMATIVO');

  return {
    payrollRunId: run.id,
    payrollRunEmployeeId: entry.id,
    competence: run.referenceLabel,
    companyName: run.company?.name || '',
    employee: {
      id: entry.employeeId,
      name: entry.employee?.name || 'Colaborador',
      email: entry.employee?.email || '',
      cpf: entry.employee?.cpf || '',
      role: entry.roleSnapshot || '',
      department: entry.departmentSnapshot || '',
    },
    totals: {
      grossAmount: Number(entry.grossAmount || 0),
      discountAmount: Number(entry.discountAmount || 0),
      netAmount: Number(entry.netAmount || 0),
      chargesAmount: Number(entry.chargesAmount || 0),
    },
    status: entry.status,
    provents,
    discounts,
    informative,
    inconsistencies: entry.breakdown.inconsistencies || [],
    generatedAt: entry.processedAt || run.processedAt || null,
  };
};

const buildChargeSummaryFromRun = (run) => {
  const serializedRun = serializeRun(run);
  const bases = serializedRun.employees.reduce(
    (acc, entry) => {
      const chargeBases = entry.breakdown?.chargeBases || {};
      acc.inssBase += Number(chargeBases.inssBase || 0);
      acc.fgtsBase += Number(chargeBases.fgtsBase || 0);
      acc.irrfBase += Number(chargeBases.irrfBase || 0);
      acc.inssAmount += Number(chargeBases.inssAmount || 0);
      acc.fgtsAmount += Number(chargeBases.fgtsAmount || 0);
      acc.irrfEstimatedAmount += Number(chargeBases.irrfEstimatedAmount || 0);
      return acc;
    },
    {
      inssBase: 0,
      fgtsBase: 0,
      irrfBase: 0,
      inssAmount: 0,
      fgtsAmount: 0,
      irrfEstimatedAmount: 0,
    }
  );

  return {
    id: run.id,
    payrollRunId: run.id,
    competence: run.referenceLabel,
    status: run.status,
    companyName: run.company?.name || '',
    totalEmployees: serializedRun.totalEmployees,
    processedEmployees: serializedRun.processedEmployees,
    conferenceStatus:
      run.status === 'FECHADA'
        ? 'CONFERIDO'
        : run.status === 'PROCESSADA'
          ? 'PRONTO_PARA_CONFERENCIA'
          : 'EM_PREPARACAO',
    totals: {
      totalGross: Number(run.totalGross || 0),
      totalDiscounts: Number(run.totalDiscounts || 0),
      totalNet: Number(run.totalNet || 0),
      totalCharges: Number(run.totalCharges || 0),
    },
    bases,
    generatedAt: run.processedAt || null,
    closedAt: run.closedAt || null,
  };
};

const getRunMovementContext = async (movementId, companyId) => {
  const movement = await prisma.payrollMovement.findFirst({
    where: {
      id: Number(movementId),
      payrollRun: {
        companyId: Number(companyId),
      },
    },
    include: {
      payrollRun: true,
      payrollEvent: true,
    },
  });

  if (!movement) {
    throw new AppError('Lancamento nao encontrado', 404);
  }

  return movement;
};

const getEligibleEmployeesForRun = async (companyId, month, year) => {
  const competenceEnd = getCompetenceEndDate(month, year);

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        {
          employeeCompanies: {
            some: {
              companyId: Number(companyId),
              status: {
                in: ACTIVE_EMPLOYEE_STATUSES,
              },
              admissionDate: {
                lte: competenceEnd,
              },
            },
          },
        },
        {
          companyId: Number(companyId),
          status: {
            in: ACTIVE_EMPLOYEE_STATUSES,
          },
          admissionDate: {
            lte: competenceEnd,
          },
        },
      ],
    },
    include: {
      employeeCompanies: {
        include: {
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
    orderBy: {
      name: 'asc',
    },
  });

  return employees
    .map((employee) => {
      const companyLink = selectEmployeeCompanyLink(employee, companyId);

      if (!companyLink) {
        return null;
      }

      return {
        employeeId: employee.id,
        roleSnapshot: companyLink.role || employee.role || '',
        departmentSnapshot: companyLink.department || employee.department || '',
        admissionDateSnapshot:
          companyLink.admissionDate || employee.admissionDate || null,
        salaryBaseSnapshot: Number(companyLink.salaryBase || 0),
      };
    })
    .filter(Boolean);
};

const buildCalculatedLines = ({
  salaryBaseSnapshot,
  fixedEvents,
  movements,
}) => {
  const lines = [];
  const inconsistencies = [];

  if (salaryBaseSnapshot > 0) {
    lines.push({
      source: 'FIXO',
      type: 'PROVENTO',
      code: 'SALARIO_BASE',
      name: 'Salario Base',
      category: 'SALARIO',
      quantity: 1,
      unitValue: Number(salaryBaseSnapshot),
      totalValue: Number(salaryBaseSnapshot),
      incidenceINSS: true,
      incidenceFGTS: true,
      incidenceIRRF: true,
      notes: '',
    });
  } else {
    inconsistencies.push('Sem salario base definido para o colaborador');
  }

  for (const fixedEvent of fixedEvents) {
    const quantity = Number(fixedEvent.quantity || 0) || 1;
    const unitValue =
      Number(fixedEvent.unitValue || 0) ||
      Number(fixedEvent.payrollEvent.defaultUnitValue || 0);
    const totalValue =
      Number(fixedEvent.totalValue || 0) || Number(quantity * unitValue);

    lines.push({
      source: 'FIXO',
      type: fixedEvent.payrollEvent.type,
      code: fixedEvent.payrollEvent.code,
      name: fixedEvent.payrollEvent.name,
      category: fixedEvent.payrollEvent.category,
      quantity,
      unitValue,
      totalValue,
      incidenceINSS: Boolean(fixedEvent.payrollEvent.incidenceINSS),
      incidenceFGTS: Boolean(fixedEvent.payrollEvent.incidenceFGTS),
      incidenceIRRF: Boolean(fixedEvent.payrollEvent.incidenceIRRF),
      notes: fixedEvent.notes || '',
    });
  }

  for (const movement of movements) {
    lines.push({
      source: movement.source,
      type: movement.type,
      code: movement.eventCode || movement.payrollEvent?.code || '',
      name: movement.eventName || movement.payrollEvent?.name || 'Lancamento',
      category:
        movement.eventCategory || movement.payrollEvent?.category || 'GERAL',
      quantity: Number(movement.quantity || 0),
      unitValue: Number(movement.unitValue || 0),
      totalValue: Number(movement.totalValue || 0),
      incidenceINSS: Boolean(movement.payrollEvent?.incidenceINSS),
      incidenceFGTS: Boolean(movement.payrollEvent?.incidenceFGTS),
      incidenceIRRF: Boolean(movement.payrollEvent?.incidenceIRRF),
      notes: movement.notes || '',
    });
  }

  const grossAmount = lines
    .filter((line) => line.type === 'PROVENTO')
    .reduce((total, line) => total + Number(line.totalValue || 0), 0);

  const discountAmount = lines
    .filter((line) => line.type === 'DESCONTO')
    .reduce((total, line) => total + Number(line.totalValue || 0), 0);

  const chargeBases = calculateChargeBases(
    lines.filter((line) => line.type !== 'INFORMATIVO')
  );

  const netAmount = grossAmount - discountAmount;

  return {
    lines,
    inconsistencies,
    grossAmount,
    discountAmount,
    netAmount,
    chargesAmount: chargeBases.totalCharges,
    chargeBases,
  };
};

const buildPayrollEventSummary = (events) => ({
  totalEvents: events.length,
  activeEvents: events.filter((event) => event.isActive).length,
  inactiveEvents: events.filter((event) => !event.isActive).length,
  fixedEvents: events.filter((event) => event.isFixed).length,
  variableEvents: events.filter((event) => event.isVariable).length,
  provents: events.filter((event) => event.type === 'PROVENTO').length,
  discounts: events.filter((event) => event.type === 'DESCONTO').length,
  informative: events.filter((event) => event.type === 'INFORMATIVO').length,
});

export const getPayrollRunsService = async (companyId, filters = {}) => {
  await ensurePayrollBaseStructure(companyId);

  const where = {
    companyId: Number(companyId),
  };

  if (filters.status && filters.status !== 'TODOS') {
    where.status = String(filters.status).toUpperCase();
  }

  if (filters.year && filters.year !== 'TODOS') {
    where.year = normalizeYear(filters.year);
  }

  const runs = await prisma.payrollRun.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      employees: true,
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const summary = {
    totalRuns: runs.length,
    openRuns: runs.filter((run) =>
      ['ABERTA', 'REABERTA', 'EM_PROCESSAMENTO'].includes(run.status)
    ).length,
    processedRuns: runs.filter((run) => run.status === 'PROCESSADA').length,
    closedRuns: runs.filter((run) => run.status === 'FECHADA').length,
    totalEmployees: runs.reduce(
      (acc, run) => acc + Number(run.totalEmployees || 0),
      0
    ),
    totalNet: runs.reduce((acc, run) => acc + Number(run.totalNet || 0), 0),
  };

  return {
    runs: runs.map((run) => ({
      id: run.id,
      month: run.month,
      year: run.year,
      referenceLabel: run.referenceLabel,
      status: run.status,
      totalEmployees: Number(run.totalEmployees || 0),
      totalGross: Number(run.totalGross || 0),
      totalDiscounts: Number(run.totalDiscounts || 0),
      totalNet: Number(run.totalNet || 0),
      totalCharges: Number(run.totalCharges || 0),
      startedAt: run.startedAt,
      processedAt: run.processedAt,
      closedAt: run.closedAt,
      reopenedAt: run.reopenedAt,
      employeeEntriesCount: run.employees.length,
    })),
    summary,
  };
};

export const getPayrollRunByIdService = async (runId, companyId) => {
  await ensurePayrollBaseStructure(companyId);
  const run = await ensureCompanyScopedRun(runId, companyId);
  return serializeRun(run);
};

export const getPayrollRunEmployeesService = async (runId, companyId) => {
  const run = await ensureCompanyScopedRun(runId, companyId);
  return serializeRun(run).employees;
};

export const getPayrollEventsService = async (companyId, filters = {}) => {
  await ensurePayrollBaseStructure(companyId);

  const where = {
    companyId: Number(companyId),
  };

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: String(filters.search).trim(),
          mode: 'insensitive',
        },
      },
      {
        code: {
          contains: String(filters.search).trim(),
          mode: 'insensitive',
        },
      },
      {
        category: {
          contains: String(filters.search).trim(),
          mode: 'insensitive',
        },
      },
    ];
  }

  if (filters.type && filters.type !== 'TODOS') {
    where.type = normalizeMovementType(filters.type);
  }

  if (filters.status && filters.status !== 'TODOS') {
    where.isActive = filters.status === 'ATIVO';
  }

  if (filters.incidence && filters.incidence !== 'TODOS') {
    const key = String(filters.incidence).toUpperCase();

    if (key === 'INSS') where.incidenceINSS = true;
    if (key === 'FGTS') where.incidenceFGTS = true;
    if (key === 'IRRF') where.incidenceIRRF = true;
  }

  const events = await prisma.payrollEvent.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const grouped = events.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }

    acc[event.category].push(serializePayrollEvent(event));
    return acc;
  }, {});

  return {
    events: events.map(serializePayrollEvent),
    grouped,
    summary: buildPayrollEventSummary(events),
  };
};

export const getPayrollEventByIdService = async (eventId, companyId) => {
  await ensurePayrollBaseStructure(companyId);
  const payrollEvent = await ensureCompanyScopedEvent(eventId, companyId);
  return serializePayrollEvent(payrollEvent);
};

export const createPayrollEventService = async (data, companyId) => {
  await ensurePayrollBaseStructure(companyId);

  const code = normalizeOptionalString(data.code)?.toUpperCase();
  const name = normalizeOptionalString(data.name);
  const category = normalizeOptionalString(data.category);

  if (!code || !name || !category) {
    throw new AppError('Informe codigo, nome e categoria do evento', 400);
  }

  const existingEvent = await prisma.payrollEvent.findFirst({
    where: {
      companyId: Number(companyId),
      code,
    },
  });

  if (existingEvent) {
    throw new AppError('Ja existe um evento com este codigo', 400);
  }

  const payrollEvent = await prisma.payrollEvent.create({
    data: {
      companyId: Number(companyId),
      code,
      name,
      category,
      type: normalizeMovementType(data.type),
      calculationType: normalizeCalculationType(data.calculationType || 'MANUAL'),
      defaultValue: normalizePositiveNumber(data.defaultValue, 0),
      defaultQuantity: normalizePositiveNumber(data.defaultQuantity, 1),
      defaultUnitValue: normalizePositiveNumber(data.defaultUnitValue, 0),
      incidenceINSS: normalizeBoolean(data.incidenceINSS, false),
      incidenceFGTS: normalizeBoolean(data.incidenceFGTS, false),
      incidenceIRRF: normalizeBoolean(data.incidenceIRRF, false),
      isFixed: normalizeBoolean(data.isFixed, false),
      isVariable: normalizeBoolean(data.isVariable, true),
      description: normalizeOptionalString(data.description),
      isActive:
        data.isActive === undefined ? true : normalizeBoolean(data.isActive, true),
      isSystem: false,
    },
  });

  return serializePayrollEvent(payrollEvent);
};

export const updatePayrollEventService = async (eventId, data, companyId) => {
  await ensurePayrollBaseStructure(companyId);
  const existingEvent = await ensureCompanyScopedEvent(eventId, companyId);

  const payload = {
    name:
      data.name !== undefined
        ? normalizeOptionalString(data.name)
        : existingEvent.name,
    category:
      data.category !== undefined
        ? normalizeOptionalString(data.category)
        : existingEvent.category,
    description:
      data.description !== undefined
        ? normalizeOptionalString(data.description)
        : existingEvent.description,
    type:
      data.type !== undefined
        ? normalizeMovementType(data.type)
        : existingEvent.type,
    calculationType:
      data.calculationType !== undefined
        ? normalizeCalculationType(data.calculationType)
        : existingEvent.calculationType,
    defaultValue:
      data.defaultValue !== undefined
        ? normalizePositiveNumber(data.defaultValue, 0)
        : existingEvent.defaultValue,
    defaultQuantity:
      data.defaultQuantity !== undefined
        ? normalizePositiveNumber(data.defaultQuantity, 1)
        : existingEvent.defaultQuantity,
    defaultUnitValue:
      data.defaultUnitValue !== undefined
        ? normalizePositiveNumber(data.defaultUnitValue, 0)
        : existingEvent.defaultUnitValue,
    incidenceINSS:
      data.incidenceINSS !== undefined
        ? normalizeBoolean(data.incidenceINSS, false)
        : existingEvent.incidenceINSS,
    incidenceFGTS:
      data.incidenceFGTS !== undefined
        ? normalizeBoolean(data.incidenceFGTS, false)
        : existingEvent.incidenceFGTS,
    incidenceIRRF:
      data.incidenceIRRF !== undefined
        ? normalizeBoolean(data.incidenceIRRF, false)
        : existingEvent.incidenceIRRF,
    isFixed:
      data.isFixed !== undefined
        ? normalizeBoolean(data.isFixed, false)
        : existingEvent.isFixed,
    isVariable:
      data.isVariable !== undefined
        ? normalizeBoolean(data.isVariable, true)
        : existingEvent.isVariable,
  };

  if (!payload.name || !payload.category) {
    throw new AppError('Nome e categoria do evento sao obrigatorios', 400);
  }

  const updatedEvent = await prisma.payrollEvent.update({
    where: {
      id: Number(eventId),
    },
    data: payload,
  });

  return serializePayrollEvent(updatedEvent);
};

export const updatePayrollEventStatusService = async (
  eventId,
  data,
  companyId
) => {
  await ensurePayrollBaseStructure(companyId);
  const existingEvent = await ensureCompanyScopedEvent(eventId, companyId);

  const updatedEvent = await prisma.payrollEvent.update({
    where: {
      id: Number(eventId),
    },
    data: {
      isActive: normalizeBoolean(data.isActive, existingEvent.isActive),
    },
  });

  return serializePayrollEvent(updatedEvent);
};

export const duplicatePayrollEventService = async (eventId, companyId) => {
  await ensurePayrollBaseStructure(companyId);
  const existingEvent = await ensureCompanyScopedEvent(eventId, companyId);

  let nextCode = `${existingEvent.code}_COPY`;
  let sequence = 1;

  while (
    await prisma.payrollEvent.findFirst({
      where: {
        companyId: Number(companyId),
        code: nextCode,
      },
      select: {
        id: true,
      },
    })
  ) {
    sequence += 1;
    nextCode = `${existingEvent.code}_COPY_${sequence}`;
  }

  const duplicatedEvent = await prisma.payrollEvent.create({
    data: {
      companyId: Number(companyId),
      code: nextCode,
      name: `${existingEvent.name} (Copia)`,
      description: existingEvent.description,
      category: existingEvent.category,
      type: existingEvent.type,
      calculationType: existingEvent.calculationType,
      defaultValue: existingEvent.defaultValue,
      defaultQuantity: existingEvent.defaultQuantity,
      defaultUnitValue: existingEvent.defaultUnitValue,
      incidenceINSS: existingEvent.incidenceINSS,
      incidenceFGTS: existingEvent.incidenceFGTS,
      incidenceIRRF: existingEvent.incidenceIRRF,
      isFixed: existingEvent.isFixed,
      isVariable: existingEvent.isVariable,
      isActive: true,
      isSystem: false,
    },
  });

  return serializePayrollEvent(duplicatedEvent);
};

export const createPayrollRunService = async (data, companyId, userId) => {
  await ensurePayrollBaseStructure(companyId);

  const month = normalizeMonth(data.month);
  const year = normalizeYear(data.year);

  const existingRun = await prisma.payrollRun.findUnique({
    where: {
      companyId_month_year: {
        companyId: Number(companyId),
        month,
        year,
      },
    },
  });

  if (existingRun) {
    throw new AppError('Ja existe uma competencia aberta para este mes/ano', 400);
  }

  const eligibleEmployees = await getEligibleEmployeesForRun(companyId, month, year);

  if (eligibleEmployees.length === 0) {
    throw new AppError(
      'Nao existem colaboradores elegiveis para abrir esta competencia',
      400
    );
  }

  const run = await prisma.payrollRun.create({
    data: {
      companyId: Number(companyId),
      month,
      year,
      referenceLabel: buildReferenceLabel(month, year),
      status: 'ABERTA',
      notes: normalizeOptionalString(data.notes),
      totalEmployees: eligibleEmployees.length,
      createdByUserId: userId ? Number(userId) : null,
      employees: {
        create: eligibleEmployees.map((entry) => ({
          employeeId: entry.employeeId,
          status: 'PENDENTE',
          roleSnapshot: entry.roleSnapshot,
          departmentSnapshot: entry.departmentSnapshot,
          admissionDateSnapshot: entry.admissionDateSnapshot,
          salaryBaseSnapshot: entry.salaryBaseSnapshot,
        })),
      },
    },
    include: payrollRunInclude,
  });

  return serializeRun(run);
};

export const processPayrollRunService = async (runId, companyId, userId) => {
  await ensurePayrollBaseStructure(companyId);
  const run = await ensureCompanyScopedRun(runId, companyId);
  ensureRunEditable(run, 'processar a competencia');

  if (!run.employees || run.employees.length === 0) {
    throw new AppError('Nao ha colaboradores carregados nesta competencia', 400);
  }

  const employeeIds = run.employees.map((entry) => entry.employeeId);

  const fixedEvents = await prisma.employeePayrollEvent.findMany({
    where: {
      companyId: Number(companyId),
      employeeId: {
        in: employeeIds,
      },
      isActive: true,
      payrollEvent: {
        isActive: true,
      },
    },
    include: {
      payrollEvent: true,
    },
  });

  const activeMovements = (run.movements || []).filter((movement) =>
    Boolean(movement.isActive)
  );

  const fixedMap = new Map();
  const movementMap = new Map();

  for (const item of fixedEvents) {
    const current = fixedMap.get(item.employeeId) || [];
    current.push(item);
    fixedMap.set(item.employeeId, current);
  }

  for (const item of activeMovements) {
    const current = movementMap.get(item.employeeId) || [];
    current.push(item);
    movementMap.set(item.employeeId, current);
  }

  const now = new Date();

  const calculatedEntries = run.employees.map((entry) => {
    const calculation = buildCalculatedLines({
      salaryBaseSnapshot: Number(entry.salaryBaseSnapshot || 0),
      fixedEvents: fixedMap.get(entry.employeeId) || [],
      movements: movementMap.get(entry.employeeId) || [],
    });

    return {
      id: entry.id,
      grossAmount: calculation.grossAmount,
      discountAmount: calculation.discountAmount,
      netAmount: calculation.netAmount,
      chargesAmount: calculation.chargesAmount,
      processedAt: now,
      hasInconsistency: calculation.inconsistencies.length > 0,
      inconsistencyNotes: calculation.inconsistencies.join(' | ') || null,
      status:
        calculation.inconsistencies.length > 0 ? 'INCONSISTENTE' : 'PROCESSADO',
      breakdown: {
        competence: run.referenceLabel,
        lines: calculation.lines,
        chargeBases: calculation.chargeBases,
        inconsistencies: calculation.inconsistencies,
      },
    };
  });

  const totals = calculatedEntries.reduce(
    (acc, entry) => {
      acc.totalGross += entry.grossAmount;
      acc.totalDiscounts += entry.discountAmount;
      acc.totalNet += entry.netAmount;
      acc.totalCharges += entry.chargesAmount;
      return acc;
    },
    {
      totalGross: 0,
      totalDiscounts: 0,
      totalNet: 0,
      totalCharges: 0,
    }
  );

  await prisma.$transaction(async (tx) => {
    await tx.payrollRun.update({
      where: {
        id: Number(runId),
      },
      data: {
        status: 'EM_PROCESSAMENTO',
      },
    });

    for (const entry of calculatedEntries) {
      await tx.payrollRunEmployee.update({
        where: {
          id: entry.id,
        },
        data: {
          grossAmount: entry.grossAmount,
          discountAmount: entry.discountAmount,
          netAmount: entry.netAmount,
          chargesAmount: entry.chargesAmount,
          processedAt: entry.processedAt,
          hasInconsistency: entry.hasInconsistency,
          inconsistencyNotes: entry.inconsistencyNotes,
          status: entry.status,
          breakdown: entry.breakdown,
        },
      });
    }

    await tx.payrollRun.update({
      where: {
        id: Number(runId),
      },
      data: {
        status: 'PROCESSADA',
        processedAt: now,
        processedByUserId: userId ? Number(userId) : null,
        totalEmployees: calculatedEntries.length,
        totalGross: totals.totalGross,
        totalDiscounts: totals.totalDiscounts,
        totalNet: totals.totalNet,
        totalCharges: totals.totalCharges,
      },
    });
  });

  const updatedRun = await ensureCompanyScopedRun(runId, companyId);
  return serializeRun(updatedRun);
};

export const closePayrollRunService = async (runId, companyId, userId) => {
  const run = await ensureCompanyScopedRun(runId, companyId);

  if (run.status !== 'PROCESSADA') {
    throw new AppError(
      'Somente competencias processadas podem ser fechadas',
      400
    );
  }

  await prisma.payrollRun.update({
    where: {
      id: Number(runId),
    },
    data: {
      status: 'FECHADA',
      closedAt: new Date(),
      closedByUserId: userId ? Number(userId) : null,
    },
  });

  const updatedRun = await ensureCompanyScopedRun(runId, companyId);
  return serializeRun(updatedRun);
};

export const reopenPayrollRunService = async (runId, companyId, userId) => {
  const run = await ensureCompanyScopedRun(runId, companyId);

  if (run.status !== 'FECHADA') {
    throw new AppError(
      'Somente competencias fechadas podem ser reabertas',
      400
    );
  }

  await prisma.payrollRun.update({
    where: {
      id: Number(runId),
    },
    data: {
      status: 'REABERTA',
      reopenedAt: new Date(),
      reopenedByUserId: userId ? Number(userId) : null,
    },
  });

  const updatedRun = await ensureCompanyScopedRun(runId, companyId);
  return serializeRun(updatedRun);
};

export const createPayrollMovementService = async (
  runId,
  data,
  companyId,
  userId
) => {
  const run = await ensureCompanyScopedRun(runId, companyId);
  ensureRunEditable(run, 'lancar itens na competencia');

  const employeeId = Number(data.employeeId);
  const payrollEventId = Number(data.payrollEventId);

  if (Number.isNaN(employeeId) || employeeId <= 0) {
    throw new AppError('Colaborador invalido para o lancamento', 400);
  }

  if (Number.isNaN(payrollEventId) || payrollEventId <= 0) {
    throw new AppError('Evento da folha invalido para o lancamento', 400);
  }

  const runEmployee = run.employees.find(
    (entry) => Number(entry.employeeId) === employeeId
  );

  if (!runEmployee) {
    throw new AppError(
      'Colaborador nao pertence a esta competencia da folha',
      400
    );
  }

  const payrollEvent = await prisma.payrollEvent.findFirst({
    where: {
      id: payrollEventId,
      companyId: Number(companyId),
      isActive: true,
    },
  });

  if (!payrollEvent) {
    throw new AppError('Evento da folha nao encontrado', 404);
  }

  const quantity = normalizePositiveNumber(
    data.quantity,
    Number(payrollEvent.defaultQuantity || 1)
  );
  const unitValue = normalizePositiveNumber(
    data.unitValue,
    Number(payrollEvent.defaultUnitValue || payrollEvent.defaultValue || 0)
  );
  const totalValue =
    data.totalValue !== undefined &&
    data.totalValue !== null &&
    data.totalValue !== ''
      ? normalizePositiveNumber(data.totalValue, 0)
      : Number(quantity * unitValue);

  const movement = await prisma.payrollMovement.create({
    data: {
      payrollRunId: Number(runId),
      employeeId,
      payrollEventId,
      type: payrollEvent.type,
      source: normalizeMovementSource(data.source || 'MANUAL'),
      eventCode: payrollEvent.code,
      eventName: payrollEvent.name,
      eventCategory: payrollEvent.category,
      quantity,
      unitValue,
      totalValue,
      notes: normalizeOptionalString(data.notes),
      createdByUserId: userId ? Number(userId) : null,
      updatedByUserId: userId ? Number(userId) : null,
    },
    include: {
      payrollEvent: true,
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return serializeMovement(movement);
};

export const updatePayrollMovementService = async (
  movementId,
  data,
  companyId,
  userId
) => {
  const movement = await getRunMovementContext(movementId, companyId);
  const run = await ensureCompanyScopedRun(movement.payrollRunId, companyId);
  ensureRunEditable(run, 'editar lancamentos da competencia');

  const payrollEventId =
    data.payrollEventId !== undefined &&
    data.payrollEventId !== null &&
    data.payrollEventId !== ''
      ? Number(data.payrollEventId)
      : movement.payrollEventId;

  const payrollEvent = payrollEventId
    ? await prisma.payrollEvent.findFirst({
        where: {
          id: payrollEventId,
          companyId: Number(companyId),
          isActive: true,
        },
      })
    : null;

  const quantity =
    data.quantity !== undefined
      ? normalizePositiveNumber(data.quantity, Number(movement.quantity || 1))
      : Number(movement.quantity || 1);
  const unitValue =
    data.unitValue !== undefined
      ? normalizePositiveNumber(data.unitValue, Number(movement.unitValue || 0))
      : Number(movement.unitValue || 0);
  const totalValue =
    data.totalValue !== undefined &&
    data.totalValue !== null &&
    data.totalValue !== ''
      ? normalizePositiveNumber(data.totalValue, 0)
      : Number(quantity * unitValue);

  const updatedMovement = await prisma.payrollMovement.update({
    where: {
      id: Number(movementId),
    },
    data: {
      payrollEventId: payrollEvent?.id || movement.payrollEventId,
      type: payrollEvent?.type || movement.type,
      source: normalizeMovementSource(data.source || movement.source),
      eventCode: payrollEvent?.code || movement.eventCode,
      eventName: payrollEvent?.name || movement.eventName,
      eventCategory: payrollEvent?.category || movement.eventCategory,
      quantity,
      unitValue,
      totalValue,
      notes:
        data.notes !== undefined
          ? normalizeOptionalString(data.notes)
          : movement.notes,
      updatedByUserId: userId ? Number(userId) : movement.updatedByUserId,
    },
    include: {
      payrollEvent: true,
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return serializeMovement(updatedMovement);
};

export const deletePayrollMovementService = async (
  movementId,
  companyId,
  userId
) => {
  const movement = await getRunMovementContext(movementId, companyId);
  const run = await ensureCompanyScopedRun(movement.payrollRunId, companyId);
  ensureRunEditable(run, 'inativar lancamentos da competencia');

  const updatedMovement = await prisma.payrollMovement.update({
    where: {
      id: Number(movementId),
    },
    data: {
      isActive: false,
      updatedByUserId: userId ? Number(userId) : movement.updatedByUserId,
    },
    include: {
      payrollEvent: true,
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return serializeMovement(updatedMovement);
};

export const getPayrollPayslipsService = async (companyId, filters = {}) => {
  const where = {
    companyId: Number(companyId),
  };

  if (filters.year && filters.year !== 'TODOS') {
    where.year = normalizeYear(filters.year);
  }

  if (filters.month && filters.month !== 'TODOS') {
    where.month = normalizeMonth(filters.month);
  }

  if (filters.status && filters.status !== 'TODOS') {
    where.status = String(filters.status).toUpperCase();
  }

  const runs = await prisma.payrollRun.findMany({
    where,
    include: payrollRunInclude,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const payslips = runs.flatMap((run) =>
    (run.employees || [])
      .filter((entry) => entry.breakdown)
      .map((entry) => buildPayslipFromEntry(run, entry))
  );

  const search = String(filters.search || '').trim().toLowerCase();

  const filteredPayslips = payslips.filter((payslip) => {
    const matchesSearch = search
      ? `
          ${payslip.employee.name}
          ${payslip.employee.email}
          ${payslip.employee.cpf}
          ${payslip.competence}
        `
          .toLowerCase()
          .includes(search)
      : true;

    if (!matchesSearch) {
      return false;
    }

    if (filters.employeeId && Number(filters.employeeId) > 0) {
      return Number(payslip.employee.id) === Number(filters.employeeId);
    }

    return true;
  });

  return {
    payslips: filteredPayslips,
    summary: {
      totalPayslips: filteredPayslips.length,
      totalEmployees: new Set(filteredPayslips.map((item) => item.employee.id)).size,
      totalNet: filteredPayslips.reduce(
        (total, item) => total + Number(item.totals.netAmount || 0),
        0
      ),
      totalGross: filteredPayslips.reduce(
        (total, item) => total + Number(item.totals.grossAmount || 0),
        0
      ),
      latestCompetence: filteredPayslips[0]?.competence || null,
    },
  };
};

export const getPayrollRunPayslipsService = async (runId, companyId) => {
  const run = await ensureCompanyScopedRun(runId, companyId);

  return (run.employees || [])
    .filter((entry) => entry.breakdown)
    .map((entry) => buildPayslipFromEntry(run, entry));
};

export const getPayrollPayslipPreviewService = async (
  runId,
  employeeId,
  companyId
) => {
  const run = await ensureCompanyScopedRun(runId, companyId);
  const entry = run.employees.find(
    (item) => Number(item.employeeId) === Number(employeeId)
  );

  if (!entry) {
    throw new AppError('Colaborador nao encontrado nesta competencia', 404);
  }

  return buildPayslipFromEntry(run, entry);
};

export const getPayrollChargesService = async (companyId, filters = {}) => {
  const where = {
    companyId: Number(companyId),
  };

  if (filters.year && filters.year !== 'TODOS') {
    where.year = normalizeYear(filters.year);
  }

  if (filters.status && filters.status !== 'TODOS') {
    where.status = String(filters.status).toUpperCase();
  }

  const runs = await prisma.payrollRun.findMany({
    where,
    include: payrollRunInclude,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const charges = runs.map(buildChargeSummaryFromRun);

  return {
    charges,
    summary: {
      totalCompetences: charges.length,
      readyForConference: charges.filter(
        (item) => item.conferenceStatus === 'PRONTO_PARA_CONFERENCIA'
      ).length,
      checkedCompetences: charges.filter(
        (item) => item.conferenceStatus === 'CONFERIDO'
      ).length,
      totalCharges: charges.reduce(
        (total, item) => total + Number(item.totals.totalCharges || 0),
        0
      ),
      totalINSSBase: charges.reduce(
        (total, item) => total + Number(item.bases.inssBase || 0),
        0
      ),
      totalFGTSBase: charges.reduce(
        (total, item) => total + Number(item.bases.fgtsBase || 0),
        0
      ),
      totalIRRFBase: charges.reduce(
        (total, item) => total + Number(item.bases.irrfBase || 0),
        0
      ),
    },
  };
};

export const getPayrollRunChargesService = async (runId, companyId) => {
  const run = await ensureCompanyScopedRun(runId, companyId);
  return buildChargeSummaryFromRun(run);
};
