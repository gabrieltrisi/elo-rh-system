import prisma from '../../prisma/client.js';
import { buildDateRangeFilter, buildReportPayload, matchesSearch } from './shared.js';

const EMPLOYER_INSS_RATE = 0.2;
const FGTS_RATE = 0.08;
const IRRF_ESTIMATED_RATE = 0.075;

export const buildChargesReport = async (filters) => {
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
        select: {
          breakdown: true,
        },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const rows = runs
    .map((run) => {
      const bases = (run.employees || []).reduce(
        (acc, item) => {
          const chargeBases = item.breakdown?.chargeBases || {};
          acc.inssBase += Number(chargeBases.inssBase || 0);
          acc.fgtsBase += Number(chargeBases.fgtsBase || 0);
          acc.irrfBase += Number(chargeBases.irrfBase || 0);
          return acc;
        },
        {
          inssBase: 0,
          fgtsBase: 0,
          irrfBase: 0,
        }
      );

      return {
        competence: run.referenceLabel,
        status: run.status,
        totalEmployees: Number(run.totalEmployees || 0),
        inssBase: bases.inssBase,
        fgtsBase: bases.fgtsBase,
        irrfBase: bases.irrfBase,
        inssAmount: bases.inssBase * EMPLOYER_INSS_RATE,
        fgtsAmount: bases.fgtsBase * FGTS_RATE,
        irrfEstimatedAmount: bases.irrfBase * IRRF_ESTIMATED_RATE,
        totalCharges: Number(run.totalCharges || 0),
        processedAt: run.processedAt,
      };
    })
    .filter((item) =>
      matchesSearch(`${item.competence} ${item.status}`, filters.search)
    );

  return buildReportPayload({
    reportType: 'charges',
    title: 'Relatorio de Encargos',
    subtitle:
      'Consolidado de bases e estimativas de encargos por competencia processada.',
    filters,
    summaryCards: [
      {
        title: 'Competencias',
        value: rows.length,
        subtitle: 'Competencias com consolidacao disponivel',
        tone: 'slate',
      },
      {
        title: 'Base INSS',
        value: rows.reduce((total, item) => total + item.inssBase, 0),
        subtitle: 'Somatorio das bases previdenciarias',
        tone: 'blue',
      },
      {
        title: 'Base FGTS',
        value: rows.reduce((total, item) => total + item.fgtsBase, 0),
        subtitle: 'Somatorio das bases fundiarias',
        tone: 'green',
      },
      {
        title: 'Encargos totais',
        value: rows.reduce((total, item) => total + item.totalCharges, 0),
        subtitle: 'Consolidado das competencias no recorte',
        tone: 'amber',
      },
    ],
    columns: [
      { key: 'competence', label: 'Competencia' },
      { key: 'status', label: 'Status' },
      { key: 'totalEmployees', label: 'Colaboradores', format: 'number' },
      { key: 'inssBase', label: 'Base INSS', format: 'currency' },
      { key: 'fgtsBase', label: 'Base FGTS', format: 'currency' },
      { key: 'irrfBase', label: 'Base IRRF', format: 'currency' },
      { key: 'totalCharges', label: 'Encargos', format: 'currency' },
      { key: 'processedAt', label: 'Processada em', format: 'datetime' },
    ],
    rows,
    tableTitle: 'Consolidacao de encargos',
    highlights: [
      `${rows.filter((item) => item.status === 'FECHADA').length} competencia(s) conferida(s)/fechada(s)`,
      `${rows.reduce((total, item) => total + item.totalEmployees, 0)} colaborador(es) considerados`,
    ],
  });
};
