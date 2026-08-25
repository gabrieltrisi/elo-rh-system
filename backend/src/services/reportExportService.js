import XLSX from 'xlsx';
import { createAuditLog } from './auditService.js';
import { buildExecutiveReportPdfBuffer } from './officialPdfService.js';
import { getReportTypeDefinition } from './reportBuilders/shared.js';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatValue = (value, format) => {
  if (value === undefined || value === null || value === '') return '-';

  if (format === 'currency') {
    return currencyFormatter.format(Number(value || 0));
  }

  if (format === 'date') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleDateString('pt-BR');
  }

  if (format === 'datetime') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleString('pt-BR');
  }

  if (format === 'number') {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  return String(value);
};

const buildSummarySheetData = (report) => {
  const summaryRows = [
    ['Relatorio', report.title],
    ['Descricao', report.subtitle],
    ['Periodo', report.periodLabel],
    ['Gerado em', formatValue(report.generatedAt, 'datetime')],
    [],
    ['Resumo executivo'],
  ];

  for (const card of report.summaryCards || []) {
    summaryRows.push([card.title, formatValue(card.value, 'text'), card.subtitle]);
  }

  if (Array.isArray(report.appliedFilters) && report.appliedFilters.length > 0) {
    summaryRows.push([]);
    summaryRows.push(['Filtros aplicados']);

    for (const filter of report.appliedFilters) {
      summaryRows.push([filter.label, filter.value]);
    }
  }

  return summaryRows;
};

export const generateReportExcelBuffer = (report) => {
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummarySheetData(report));
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  const dataRows = (report.rows || []).map((row) => {
    const normalized = {};

    for (const column of report.columns || []) {
      normalized[column.label] = formatValue(row[column.key], column.format);
    }

    return normalized;
  });

  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Dados');

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });
};

export const generateReportPdfBuffer = (report) => {
  return buildExecutiveReportPdfBuffer(report);
};

export const registerReportExportAudit = async ({
  req,
  report,
  format,
  user,
}) => {
  const reportDefinition = getReportTypeDefinition(report.reportType);

  await createAuditLog({
    req,
    user,
    module: 'reports',
    entityType: 'report',
    entityId: report.reportType,
    action: 'EXPORT',
    severity: 'INFO',
    summary: `Relatorio exportado em ${String(format).toUpperCase()}: ${reportDefinition.label}`,
    details: {
      format,
      reportType: report.reportType,
      rowCount: report.rows.length,
      periodLabel: report.periodLabel,
      filters: report.appliedFilters,
    },
  });
};
