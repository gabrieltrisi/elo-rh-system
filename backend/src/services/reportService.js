import AppError from '../errors/AppError.js';
import { createAuditLog } from './auditService.js';
import {
  getReportOptionsService,
  getReportTypeDefinition,
  normalizeReportFilters,
} from './reportBuilders/shared.js';
import { buildEmployeeReport } from './reportBuilders/employeeReportBuilder.js';
import { buildOccurrenceReport } from './reportBuilders/occurrenceReportBuilder.js';
import { buildDocumentReport } from './reportBuilders/documentReportBuilder.js';
import { buildJourneyReport } from './reportBuilders/journeyReportBuilder.js';
import { buildPayrollReport } from './reportBuilders/payrollReportBuilder.js';
import { buildPayslipReport } from './reportBuilders/payslipReportBuilder.js';
import { buildChargesReport } from './reportBuilders/chargesReportBuilder.js';
import { buildAuditReport } from './reportBuilders/auditReportBuilder.js';

const reportBuilders = {
  employees: buildEmployeeReport,
  occurrences: buildOccurrenceReport,
  documents: buildDocumentReport,
  journey: buildJourneyReport,
  payroll: buildPayrollReport,
  payslips: buildPayslipReport,
  charges: buildChargesReport,
  audit: buildAuditReport,
};

const hasPermission = (user, permission) => {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const role = String(user?.role || '').toUpperCase();

  return (
    role === 'SUPER_ADMIN' ||
    permissions.includes('*') ||
    permissions.includes(permission)
  );
};

const reportTypeRequiredPermission = {
  employees: 'reports.hr',
  occurrences: 'reports.hr',
  documents: 'reports.hr',
  journey: 'reports.hr',
  payroll: 'reports.payroll',
  payslips: 'reports.payroll',
  charges: 'reports.payroll',
  audit: 'reports.audit',
};

export const getReportOptions = async (user) => getReportOptionsService(user);

export const getReportPreviewService = async (query, user, req = null) => {
  const filters = normalizeReportFilters(query, user);
  const builder = reportBuilders[filters.reportType];

  if (!builder) {
    throw new AppError('Tipo de relatorio invalido', 400);
  }

  const scopedPermission = reportTypeRequiredPermission[filters.reportType];

  if (scopedPermission && !hasPermission(user, scopedPermission)) {
    throw new AppError(
      'Voce nao possui permissao para acessar este tipo de relatorio',
      403
    );
  }

  const report = await builder(filters, user);
  const reportDefinition = getReportTypeDefinition(filters.reportType);

  await createAuditLog({
    req,
    module: 'reports',
    entityType: 'report',
    entityId: filters.reportType,
    action: 'VIEW',
    severity: 'INFO',
    summary: `Preview gerado para ${reportDefinition.label}`,
    details: {
      reportType: filters.reportType,
      filters,
      rowCount: report.rows.length,
    },
  });

  return report;
};
