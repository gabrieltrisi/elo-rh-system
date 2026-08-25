import prisma from '../../prisma/client.js';

export const REPORT_TYPES = [
  {
    value: 'employees',
    label: 'Relatorio Geral de Colaboradores',
    description: 'Base de pessoas, status, admissoes e distribuicao operacional.',
  },
  {
    value: 'occurrences',
    label: 'Relatorio de Ocorrencias',
    description:
      'Atestados, advertencias, suspensoes e afastamentos registrados no periodo.',
  },
  {
    value: 'documents',
    label: 'Relatorio de Documentacao',
    description:
      'Uploads, documentos por modulo, pendencias operacionais e trilha documental.',
  },
  {
    value: 'journey',
    label: 'Relatorio de Jornada',
    description:
      'Horas, banco operacional, faltas, extras e leitura por colaborador.',
  },
  {
    value: 'payroll',
    label: 'Relatorio de Folha de Pagamento',
    description:
      'Competencias, totais da folha, colaboradores processados e resultados consolidados.',
  },
  {
    value: 'payslips',
    label: 'Relatorio de Holerites',
    description:
      'Demonstrativos por competencia e colaborador com totais de proventos e descontos.',
  },
  {
    value: 'charges',
    label: 'Relatorio de Encargos',
    description:
      'Bases consolidadas, totais estimados e conferencia por competencia.',
  },
  {
    value: 'audit',
    label: 'Relatorio de Auditoria',
    description:
      'Trilha de acoes por usuario, modulo, severidade e periodo.',
  },
];

export const getReportTypeDefinition = (reportType) =>
  REPORT_TYPES.find((item) => item.value === reportType) || REPORT_TYPES[0];

export const normalizeReportFilters = (query = {}, user = {}) => {
  const normalizeOptional = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
  };

  const normalizeNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const normalized = Number(value);
    return Number.isNaN(normalized) ? null : normalized;
  };

  const startDate = normalizeOptional(query.startDate);
  const endDate = normalizeOptional(query.endDate);
  const companyId = normalizeNumber(query.companyId) || Number(user.companyId);

  return {
    reportType: normalizeOptional(query.reportType) || 'employees',
    startDate,
    endDate,
    companyId,
    employeeId: normalizeNumber(query.employeeId),
    department: normalizeOptional(query.department),
    status: normalizeOptional(query.status),
    userId: normalizeNumber(query.userId),
    module: normalizeOptional(query.module),
    search: normalizeOptional(query.search),
    year: normalizeNumber(query.year),
    month: normalizeNumber(query.month),
  };
};

export const buildDateRangeFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return undefined;

  const filter = {};

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    filter.gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }

  return filter;
};

export const employeeCompanyInclude = {
  company: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

export const employeeBaseSelect = {
  id: true,
  name: true,
  cpf: true,
  email: true,
  phone: true,
  role: true,
  department: true,
  admissionDate: true,
  status: true,
  companyId: true,
  createdAt: true,
  employeeCompanies: {
    include: employeeCompanyInclude,
    orderBy: {
      createdAt: 'asc',
    },
  },
};

export const resolvePrimaryCompanyLink = (employee, companyId) => {
  const links = Array.isArray(employee.employeeCompanies)
    ? employee.employeeCompanies
    : [];

  return (
    links.find((item) => item.isPrimary) ||
    links.find((item) => Number(item.companyId) === Number(companyId)) ||
    links[0] ||
    null
  );
};

export const matchesDepartment = (employee, department) => {
  if (!department) return true;

  const departmentLower = department.toLowerCase();
  const directDepartment = String(employee.department || '').toLowerCase();

  if (directDepartment === departmentLower) {
    return true;
  }

  return (employee.employeeCompanies || []).some(
    (item) => String(item.department || '').toLowerCase() === departmentLower
  );
};

export const matchesStatus = (employee, status) => {
  if (!status) return true;

  const normalizedStatus = String(status).toLowerCase();

  if (String(employee.status || '').toLowerCase() === normalizedStatus) {
    return true;
  }

  return (employee.employeeCompanies || []).some(
    (item) => String(item.status || '').toLowerCase() === normalizedStatus
  );
};

export const matchesSearch = (haystack, search) => {
  if (!search) return true;

  return String(haystack || '')
    .toLowerCase()
    .includes(String(search).toLowerCase());
};

export const formatPeriodLabel = (filters) => {
  if (filters.startDate && filters.endDate) {
    return `${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
  }

  if (filters.startDate) {
    return `A partir de ${new Date(filters.startDate).toLocaleDateString('pt-BR')}`;
  }

  if (filters.endDate) {
    return `Até ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
  }

  if (filters.month && filters.year) {
    return `${String(filters.month).padStart(2, '0')}/${filters.year}`;
  }

  if (filters.year) {
    return `Ano ${filters.year}`;
  }

  return 'Periodo integral';
};

export const buildAppliedFilters = async (filters) => {
  const appliedFilters = [];

  if (filters.startDate || filters.endDate) {
    appliedFilters.push({
      label: 'Periodo',
      value: formatPeriodLabel(filters),
    });
  }

  if (filters.companyId) {
    const company = await prisma.company.findUnique({
      where: {
        id: Number(filters.companyId),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (company) {
      appliedFilters.push({
        label: 'Empresa',
        value: company.name,
      });
    }
  }

  if (filters.department) {
    appliedFilters.push({
      label: 'Departamento',
      value: filters.department,
    });
  }

  if (filters.status) {
    appliedFilters.push({
      label: 'Status',
      value: filters.status,
    });
  }

  if (filters.search) {
    appliedFilters.push({
      label: 'Busca',
      value: filters.search,
    });
  }

  return appliedFilters;
};

export const buildReportPayload = async ({
  reportType,
  title,
  subtitle,
  filters,
  summaryCards = [],
  columns = [],
  rows = [],
  tableTitle = 'Previa do relatorio',
  highlights = [],
}) => {
  return {
    reportType,
    title,
    subtitle,
    generatedAt: new Date().toISOString(),
    periodLabel: formatPeriodLabel(filters),
    appliedFilters: await buildAppliedFilters(filters),
    summaryCards,
    columns,
    rows,
    tableTitle,
    highlights,
  };
};

export const getReportOptionsService = async (user) => {
  const companyId = Number(user.companyId);

  const [employees, companies, users] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          {
            companyId,
          },
          {
            employeeCompanies: {
              some: {
                companyId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        department: true,
        role: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.user.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  const departments = Array.from(
    new Set(
      employees
        .map((item) => item.department)
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    reportTypes: REPORT_TYPES,
    employees,
    departments,
    companies,
    users,
  };
};
