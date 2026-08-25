import prisma from '../../prisma/client.js';
import {
  buildDateRangeFilter,
  buildReportPayload,
  matchesSearch,
} from './shared.js';

const mapOccurrenceRow = ({
  type,
  employee,
  date,
  status,
  title,
  description,
  responsible = '-',
}) => ({
  type,
  collaborator: employee?.name || 'Colaborador',
  department: employee?.department || '-',
  role: employee?.role || '-',
  date,
  status: status || '-',
  title: title || '-',
  responsible,
  description: description || '-',
});

export const buildOccurrenceReport = async (filters) => {
  const dateRange = buildDateRangeFilter(filters.startDate, filters.endDate);

  const baseEmployeeWhere = {
    OR: [
      {
        companyId: Number(filters.companyId),
      },
      {
        employeeCompanies: {
          some: {
            companyId: Number(filters.companyId),
          },
        },
      },
    ],
    ...(filters.employeeId
      ? {
          id: Number(filters.employeeId),
        }
      : {}),
    ...(filters.department
      ? {
          OR: [
            {
              department: filters.department,
            },
            {
              employeeCompanies: {
                some: {
                  companyId: Number(filters.companyId),
                  department: filters.department,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [certificates, warnings, suspensions, leaves] = await Promise.all([
    prisma.certificate.findMany({
      where: {
        ...(dateRange ? { startDate: dateRange } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        employee: baseEmployeeWhere,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    }),
    prisma.warning.findMany({
      where: {
        companyId: Number(filters.companyId),
        ...(dateRange ? { warningDate: dateRange } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.employeeId ? { employeeId: Number(filters.employeeId) } : {}),
        employee: filters.department
          ? {
              OR: [
                { department: filters.department },
                {
                  employeeCompanies: {
                    some: {
                      companyId: Number(filters.companyId),
                      department: filters.department,
                    },
                  },
                },
              ],
            }
          : undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: {
        warningDate: 'desc',
      },
    }),
    prisma.suspension.findMany({
      where: {
        companyId: Number(filters.companyId),
        ...(dateRange ? { startDate: dateRange } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.employeeId ? { employeeId: Number(filters.employeeId) } : {}),
        employee: filters.department
          ? {
              OR: [
                { department: filters.department },
                {
                  employeeCompanies: {
                    some: {
                      companyId: Number(filters.companyId),
                      department: filters.department,
                    },
                  },
                },
              ],
            }
          : undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    }),
    prisma.employeeLeave.findMany({
      where: {
        companyId: Number(filters.companyId),
        ...(dateRange ? { startDate: dateRange } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.employeeId ? { employeeId: Number(filters.employeeId) } : {}),
        employee: filters.department
          ? {
              OR: [
                { department: filters.department },
                {
                  employeeCompanies: {
                    some: {
                      companyId: Number(filters.companyId),
                      department: filters.department,
                    },
                  },
                },
              ],
            }
          : undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    }),
  ]);

  const rows = [
    ...certificates.map((item) =>
      mapOccurrenceRow({
        type: 'Atestado',
        employee: item.employee,
        date: item.startDate,
        status: item.status,
        title: item.title,
        description: item.managerNotes,
      })
    ),
    ...warnings.map((item) =>
      mapOccurrenceRow({
        type: 'Advertencia',
        employee: item.employee,
        date: item.warningDate,
        status: item.status,
        title: item.title,
        description: item.description,
      })
    ),
    ...suspensions.map((item) =>
      mapOccurrenceRow({
        type: 'Suspensao',
        employee: item.employee,
        date: item.startDate,
        status: item.status,
        title: item.title,
        description: item.description,
      })
    ),
    ...leaves.map((item) =>
      mapOccurrenceRow({
        type: 'Afastamento',
        employee: item.employee,
        date: item.startDate,
        status: item.status,
        title: item.type,
        description: item.description,
      })
    ),
  ]
    .filter((item) =>
      matchesSearch(
        `${item.type} ${item.collaborator} ${item.department} ${item.title} ${item.description}`,
        filters.search
      )
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const byType = rows.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return buildReportPayload({
    reportType: 'occurrences',
    title: 'Relatorio de Ocorrencias',
    subtitle:
      'Consolidado de atestados, advertencias, suspensoes e afastamentos por periodo.',
    filters,
    summaryCards: [
      {
        title: 'Total de ocorrencias',
        value: rows.length,
        subtitle: 'Volume consolidado no recorte atual',
        tone: 'slate',
      },
      {
        title: 'Atestados',
        value: byType.Atestado || 0,
        subtitle: 'Registros medicos no periodo',
        tone: 'blue',
      },
      {
        title: 'Advertencias',
        value: byType.Advertencia || 0,
        subtitle: 'Ocorrencias disciplinares registradas',
        tone: 'amber',
      },
      {
        title: 'Afastamentos/Suspensoes',
        value: (byType.Afastamento || 0) + (byType.Suspensao || 0),
        subtitle: 'Casos que exigem monitoramento prioritario',
        tone: 'rose',
      },
    ],
    columns: [
      { key: 'type', label: 'Tipo' },
      { key: 'collaborator', label: 'Colaborador' },
      { key: 'department', label: 'Departamento' },
      { key: 'role', label: 'Cargo' },
      { key: 'date', label: 'Data', format: 'date' },
      { key: 'status', label: 'Status' },
      { key: 'title', label: 'Titulo' },
      { key: 'description', label: 'Observacao' },
    ],
    rows,
    tableTitle: 'Linha de ocorrencias',
    highlights: Object.entries(byType).map(
      ([type, count]) => `${type}: ${count} registro(s)`
    ),
  });
};
