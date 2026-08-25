import prisma from '../../prisma/client.js';
import { buildDateRangeFilter, buildReportPayload, matchesSearch } from './shared.js';

export const buildPayslipReport = async (filters) => {
  const dateRange = buildDateRangeFilter(filters.startDate, filters.endDate);

  const runs = await prisma.payrollRun.findMany({
    where: {
      companyId: Number(filters.companyId),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.year ? { year: Number(filters.year) } : {}),
      ...(filters.month ? { month: Number(filters.month) } : {}),
      ...(dateRange ? { processedAt: dateRange } : {}),
    },
    include: {
      employees: {
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
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const rows = runs
    .flatMap((run) =>
      (run.employees || [])
        .filter((item) => item.breakdown)
        .map((item) => ({
          collaborator: item.employee?.name || 'Colaborador',
          department: item.departmentSnapshot || item.employee?.department || '-',
          role: item.roleSnapshot || item.employee?.role || '-',
          competence: run.referenceLabel,
          status: item.status,
          grossAmount: Number(item.grossAmount || 0),
          discountAmount: Number(item.discountAmount || 0),
          netAmount: Number(item.netAmount || 0),
          generatedAt: item.processedAt || run.processedAt || run.updatedAt,
        }))
    )
    .filter((item) => {
      const employeeMatches = filters.employeeId
        ? runs.some((run) =>
            run.employees.some(
              (entry) =>
                entry.employeeId === Number(filters.employeeId) &&
                entry.breakdown &&
                entry.employee?.name === item.collaborator &&
                run.referenceLabel === item.competence
            )
          )
        : true;

      return (
        employeeMatches &&
        matchesSearch(
          `${item.collaborator} ${item.department} ${item.role} ${item.competence}`,
          filters.search
        )
      );
    });

  return buildReportPayload({
    reportType: 'payslips',
    title: 'Relatorio de Holerites',
    subtitle:
      'Consulta mensal de demonstrativos de pagamento por colaborador e competencia.',
    filters,
    summaryCards: [
      {
        title: 'Holerites encontrados',
        value: rows.length,
        subtitle: 'Demonstrativos disponiveis no recorte atual',
        tone: 'slate',
      },
      {
        title: 'Total bruto',
        value: rows.reduce((total, item) => total + item.grossAmount, 0),
        subtitle: 'Proventos somados dos demonstrativos',
        tone: 'green',
      },
      {
        title: 'Total liquido',
        value: rows.reduce((total, item) => total + item.netAmount, 0),
        subtitle: 'Liquido consolidado do conjunto',
        tone: 'blue',
      },
      {
        title: 'Pendencias/inconsistencias',
        value: rows.filter((item) => item.status === 'INCONSISTENTE').length,
        subtitle: 'Holerites que exigem revisao antes do fechamento',
        tone: 'amber',
      },
    ],
    columns: [
      { key: 'collaborator', label: 'Colaborador' },
      { key: 'department', label: 'Departamento' },
      { key: 'role', label: 'Cargo' },
      { key: 'competence', label: 'Competencia' },
      { key: 'status', label: 'Status' },
      { key: 'grossAmount', label: 'Proventos', format: 'currency' },
      { key: 'discountAmount', label: 'Descontos', format: 'currency' },
      { key: 'netAmount', label: 'Liquido', format: 'currency' },
      { key: 'generatedAt', label: 'Gerado em', format: 'datetime' },
    ],
    rows,
    tableTitle: 'Previa de holerites',
    highlights: [
      `${rows.filter((item) => item.status === 'PROCESSADO').length} holerite(s) processado(s)`,
      `${rows.filter((item) => item.status === 'INCONSISTENTE').length} holerite(s) com alerta`,
    ],
  });
};
