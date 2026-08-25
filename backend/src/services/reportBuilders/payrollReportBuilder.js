import prisma from '../../prisma/client.js';
import { buildDateRangeFilter, buildReportPayload, matchesSearch } from './shared.js';

export const buildPayrollReport = async (filters) => {
  const dateRange = buildDateRangeFilter(filters.startDate, filters.endDate);

  const runs = await prisma.payrollRun.findMany({
    where: {
      companyId: Number(filters.companyId),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.year ? { year: Number(filters.year) } : {}),
      ...(filters.month ? { month: Number(filters.month) } : {}),
      ...(dateRange ? { startedAt: dateRange } : {}),
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const rows = runs
    .map((run) => ({
      competence: run.referenceLabel,
      company: run.company?.name || '-',
      status: run.status,
      totalEmployees: Number(run.totalEmployees || 0),
      totalGross: Number(run.totalGross || 0),
      totalDiscounts: Number(run.totalDiscounts || 0),
      totalNet: Number(run.totalNet || 0),
      totalCharges: Number(run.totalCharges || 0),
      processedAt: run.processedAt,
      closedAt: run.closedAt,
      startedAt: run.startedAt,
    }))
    .filter((item) =>
      matchesSearch(`${item.competence} ${item.company} ${item.status}`, filters.search)
    );

  return buildReportPayload({
    reportType: 'payroll',
    title: 'Relatorio de Folha de Pagamento',
    subtitle:
      'Leitura consolidada das competencias, totais financeiros e status operacionais.',
    filters,
    summaryCards: [
      {
        title: 'Competencias',
        value: rows.length,
        subtitle: 'Competencias encontradas para o recorte',
        tone: 'slate',
      },
      {
        title: 'Bruto consolidado',
        value: rows.reduce((total, item) => total + item.totalGross, 0),
        subtitle: 'Somatorio bruto processado',
        tone: 'green',
      },
      {
        title: 'Liquido consolidado',
        value: rows.reduce((total, item) => total + item.totalNet, 0),
        subtitle: 'Resultado liquido das competencias listadas',
        tone: 'blue',
      },
      {
        title: 'Competencias fechadas',
        value: rows.filter((item) => item.status === 'FECHADA').length,
        subtitle: 'Ciclos concluídos e bloqueados para edicao',
        tone: 'violet',
      },
    ],
    columns: [
      { key: 'competence', label: 'Competencia' },
      { key: 'company', label: 'Empresa' },
      { key: 'status', label: 'Status' },
      { key: 'totalEmployees', label: 'Colaboradores', format: 'number' },
      { key: 'totalGross', label: 'Bruto', format: 'currency' },
      { key: 'totalDiscounts', label: 'Descontos', format: 'currency' },
      { key: 'totalNet', label: 'Liquido', format: 'currency' },
      { key: 'totalCharges', label: 'Encargos', format: 'currency' },
      { key: 'processedAt', label: 'Processada em', format: 'datetime' },
    ],
    rows,
    tableTitle: 'Competencias da folha',
    highlights: [
      `${rows.filter((item) => item.status === 'PROCESSADA').length} competencia(s) processada(s)`,
      `${rows.filter((item) => item.status === 'FECHADA').length} competencia(s) fechada(s)`,
    ],
  });
};
