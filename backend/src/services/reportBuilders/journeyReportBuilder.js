import prisma from '../../prisma/client.js';
import { buildDateRangeFilter, buildReportPayload, matchesSearch } from './shared.js';

export const buildJourneyReport = async (filters) => {
  const workHours = await prisma.workHour.findMany({
    where: {
      employee: {
        OR: [
          { companyId: Number(filters.companyId) },
          {
            employeeCompanies: {
              some: {
                companyId: Number(filters.companyId),
              },
            },
          },
        ],
        ...(filters.employeeId ? { id: Number(filters.employeeId) } : {}),
        ...(filters.department
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
          : {}),
      },
      ...(filters.year ? { referenceYear: Number(filters.year) } : {}),
      ...(filters.month ? { referenceMonth: Number(filters.month) } : {}),
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
    orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
  });

  const leaveDateRange = buildDateRangeFilter(filters.startDate, filters.endDate);

  const leaves = await prisma.employeeLeave.findMany({
    where: {
      companyId: Number(filters.companyId),
      ...(leaveDateRange ? { startDate: leaveDateRange } : {}),
      ...(filters.employeeId ? { employeeId: Number(filters.employeeId) } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: true,
        },
      },
    },
  });

  const rows = workHours
    .map((item) => ({
      collaborator: item.employee?.name || 'Colaborador',
      department: item.employee?.department || '-',
      role: item.employee?.role || '-',
      reference: `${String(item.referenceMonth).padStart(2, '0')}/${item.referenceYear}`,
      normalHours: Number(item.normalHours || 0),
      extraHours50: Number(item.extraHours50 || 0),
      extraHours100: Number(item.extraHours100 || 0),
      nightHours20: Number(item.nightHours20 || 0),
      nightExtraHours70: Number(item.nightExtraHours70 || 0),
      totalPaid: Number(item.totalPaid || 0),
    }))
    .filter((item) =>
      matchesSearch(
        `${item.collaborator} ${item.department} ${item.role} ${item.reference}`,
        filters.search
      )
    );

  const totalExtraHours = rows.reduce(
    (total, item) => total + item.extraHours50 + item.extraHours100,
    0
  );

  return buildReportPayload({
    reportType: 'journey',
    title: 'Relatorio de Jornada',
    subtitle:
      'Consolidado de horas registradas, extras e ausencias relacionadas ao periodo.',
    filters,
    summaryCards: [
      {
        title: 'Registros de jornada',
        value: rows.length,
        subtitle: 'Competencias de horas encontradas no recorte',
        tone: 'slate',
      },
      {
        title: 'Horas extras',
        value: totalExtraHours.toFixed(1),
        subtitle: 'Somatorio de 50% e 100%',
        tone: 'blue',
      },
      {
        title: 'Afastamentos no periodo',
        value: leaves.length,
        subtitle: 'Eventos que impactam a leitura operacional',
        tone: 'amber',
      },
      {
        title: 'Total pago',
        value: rows.reduce((total, item) => total + item.totalPaid, 0).toFixed(2),
        subtitle: 'Base financeira registrada em jornada',
        tone: 'violet',
      },
    ],
    columns: [
      { key: 'collaborator', label: 'Colaborador' },
      { key: 'department', label: 'Departamento' },
      { key: 'role', label: 'Cargo' },
      { key: 'reference', label: 'Referencia' },
      { key: 'normalHours', label: 'Horas normais', format: 'number' },
      { key: 'extraHours50', label: 'Extra 50%', format: 'number' },
      { key: 'extraHours100', label: 'Extra 100%', format: 'number' },
      { key: 'totalPaid', label: 'Total pago', format: 'currency' },
    ],
    rows,
    tableTitle: 'Consolidado de jornada',
    highlights: [
      `${leaves.length} afastamento(s) interferindo no periodo`,
      `${totalExtraHours.toFixed(1)} hora(s) extra consolidada(s)`,
    ],
  });
};
