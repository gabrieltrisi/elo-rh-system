import fs from 'fs/promises';
import path from 'path';
import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { hasPermission } from '../middlewares/authorization.js';
import { resolveFileReference } from '../utils/filePath.js';
import { createAuditLog } from './auditService.js';
import { registerManagedFileService } from './storageIntegrationService.js';
import {
  createOfficialPdfBuffer,
  formatPdfCurrency,
  formatPdfDate,
} from './pdfService.js';
import { getPayrollPayslipPreviewService } from '../modules/payroll/payrollService.js';
import { getPerformancePdfPayloadService } from '../modules/performance/performanceService.js';

const OFFICIAL_PDFS_FOLDER = 'official-pdfs';
const OFFICIAL_PDFS_ROOT = path.resolve(process.cwd(), 'uploads', OFFICIAL_PDFS_FOLDER);
const PDF_READ_PERMISSION_BY_MODULE = {
  payslips: 'payroll.payslip.read',
  warnings: 'warnings.read',
  suspensions: 'suspensions.read',
  reports: 'reports.read',
  performance: 'performance.pdf.read',
  documents: 'documents.read',
};

const sanitizeFilePart = (value) =>
  String(value || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'documento';

const normalizeEmployeeMeta = (employee = {}) => [
  { label: 'Colaborador', value: employee.name || 'Colaborador' },
  { label: 'CPF', value: employee.cpf || '-' },
  { label: 'Cargo', value: employee.role || '-' },
  { label: 'Departamento', value: employee.department || '-' },
];

const getCompanyDisplayName = (company = {}) =>
  company.tradeName || company.legalName || company.name || 'EloSystem';

const persistOfficialPdfDocument = async ({
  buffer,
  companyId,
  module,
  entityType,
  entityId = null,
  employeeId = null,
  user = null,
  fileName,
}) => {
  await fs.mkdir(OFFICIAL_PDFS_ROOT, { recursive: true });

  const storedName = `${sanitizeFilePart(fileName).replace(/\.pdf$/i, '')}-${Date.now()}.pdf`;
  const absolutePath = path.join(OFFICIAL_PDFS_ROOT, storedName);
  await fs.writeFile(absolutePath, buffer);

  const storageObject = await registerManagedFileService({
    companyId,
    module,
    entityType,
    entityId,
    employeeId,
    uploadedByUserId: user?.userId,
    file: {
      path: absolutePath,
      filename: storedName,
      originalname: fileName,
      mimetype: 'application/pdf',
      size: buffer.length,
    },
    originalName: fileName,
    mimeType: 'application/pdf',
    size: buffer.length,
    storedName,
    storedPath: `/uploads/${OFFICIAL_PDFS_FOLDER}/${storedName}`,
  });

  return {
    storageObject,
    fileName: storedName,
    fileUrl: `/uploads/${OFFICIAL_PDFS_FOLDER}/${storedName}`,
    viewUrl: `/pdf/storage/${storageObject.id}/view`,
    downloadUrl: `/pdf/storage/${storageObject.id}/download`,
    corporateUrl: storageObject.webUrl || storageObject.externalUrl || null,
    syncStatus: storageObject.syncStatus,
  };
};

const auditOfficialPdf = ({
  req,
  user,
  companyId,
  module,
  entityType,
  entityId,
  action,
  summary,
  details,
}) =>
  createAuditLog({
    req,
    user,
    companyId,
    module,
    entityType,
    entityId,
    action,
    severity: 'INFO',
    summary,
    details,
  }).catch(() => null);

export const buildPayslipPdfBuffer = (payslip) => {
  const provents = (payslip.provents || []).map((item) => ({
    code: item.code || '-',
    description: item.name || 'Evento',
    reference: item.category || '-',
    value: formatPdfCurrency(item.totalValue),
  }));
  const discounts = (payslip.discounts || []).map((item) => ({
    code: item.code || '-',
    description: item.name || 'Evento',
    reference: item.category || '-',
    value: formatPdfCurrency(item.totalValue),
  }));

  return createOfficialPdfBuffer({
    title: 'Holerite',
    subtitle: 'Demonstrativo de pagamento gerado a partir da competencia processada.',
    companyName: payslip.companyName,
    documentCode: `Competencia ${payslip.competence}`,
    meta: [
      ...normalizeEmployeeMeta(payslip.employee),
      { label: 'Competencia', value: payslip.competence },
      { label: 'Status', value: payslip.status || '-' },
    ],
    summaryCards: [
      {
        label: 'Total bruto',
        value: formatPdfCurrency(payslip.totals?.grossAmount),
        textColor: [0.02, 0.47, 0.28],
      },
      {
        label: 'Descontos',
        value: formatPdfCurrency(payslip.totals?.discountAmount),
        textColor: [0.70, 0.10, 0.10],
      },
      {
        label: 'Liquido',
        value: formatPdfCurrency(payslip.totals?.netAmount),
        textColor: [0.08, 0.24, 0.62],
      },
    ],
    tables: [
      {
        title: 'Proventos',
        columns: [
          { key: 'code', label: 'Codigo', width: 70 },
          { key: 'description', label: 'Descricao', width: 285 },
          { key: 'reference', label: 'Referencia', width: 95 },
          { key: 'value', label: 'Valor', width: 57 },
        ],
        rows: provents,
      },
      {
        title: 'Descontos',
        columns: [
          { key: 'code', label: 'Codigo', width: 70 },
          { key: 'description', label: 'Descricao', width: 285 },
          { key: 'reference', label: 'Referencia', width: 95 },
          { key: 'value', label: 'Valor', width: 57 },
        ],
        rows: discounts,
      },
    ],
    sections: [
      {
        title: 'Observacao institucional',
        text:
          'Este demonstrativo foi gerado com base nos resultados consolidados da folha. Para divergencias, revisar a competencia e os lancamentos antes de nova emissao.',
      },
    ],
  });
};

export const generatePayslipPdfService = async ({
  runId,
  employeeId,
  companyId,
  user,
  req,
}) => {
  const payslip = await getPayrollPayslipPreviewService(runId, employeeId, companyId);
  const buffer = buildPayslipPdfBuffer(payslip);
  const fileName = `holerite-${payslip.competence}-${payslip.employee.name}.pdf`;
  const document = await persistOfficialPdfDocument({
    buffer,
    companyId,
    module: 'payslips',
    entityType: 'payslip_pdf',
    entityId: payslip.payrollRunEmployeeId,
    employeeId: payslip.employee.id,
    user,
    fileName,
  });

  await auditOfficialPdf({
    req,
    user,
    companyId,
    module: 'payslips',
    entityType: 'payslip_pdf',
    entityId: document.storageObject.id,
    action: 'EXPORT',
    summary: `Holerite em PDF gerado para ${payslip.employee.name}`,
    details: {
      payrollRunId: runId,
      employeeId,
      competence: payslip.competence,
      storageObjectId: document.storageObject.id,
      syncStatus: document.syncStatus,
      corporateUrl: document.corporateUrl,
    },
  });

  return document;
};

const getWarningForPdf = async (warningId, companyId) => {
  const warning = await prisma.warning.findFirst({
    where: {
      id: Number(warningId),
      companyId: Number(companyId),
    },
    include: {
      employee: true,
      company: true,
    },
  });

  if (!warning) {
    throw new AppError('Advertencia nao encontrada', 404);
  }

  return warning;
};

export const generateWarningPdfService = async ({ warningId, companyId, user, req }) => {
  const warning = await getWarningForPdf(warningId, companyId);
  const companyName = getCompanyDisplayName(warning.company);
  const buffer = createOfficialPdfBuffer({
    title: 'Advertencia Oficial',
    subtitle: 'Registro disciplinar emitido pelo EloSystem.',
    companyName,
    documentCode: `Advertencia #${warning.id}`,
    meta: [
      ...normalizeEmployeeMeta(warning.employee),
      { label: 'Tipo', value: warning.type },
      { label: 'Data da advertencia', value: formatPdfDate(warning.warningDate) },
      { label: 'Status', value: warning.status },
    ],
    sections: [
      {
        title: 'Motivo',
        text: warning.title,
      },
      {
        title: 'Descricao formal',
        text:
          warning.description ||
          'Registro emitido para ciencia do colaborador e acompanhamento administrativo.',
      },
      {
        title: 'Orientacao',
        text:
          'O colaborador declara ciencia deste registro. Este documento podera receber assinatura digital ou fisica em fluxo complementar.',
      },
    ],
    signatures: ['Colaborador', 'Responsavel pelo RH', 'Testemunha / Gestor'],
  });
  const document = await persistOfficialPdfDocument({
    buffer,
    companyId,
    module: 'warnings',
    entityType: 'warning_pdf',
    entityId: warning.id,
    employeeId: warning.employeeId,
    user,
    fileName: `advertencia-${warning.id}-${warning.employee.name}.pdf`,
  });

  await auditOfficialPdf({
    req,
    user,
    companyId,
    module: 'warnings',
    entityType: 'warning_pdf',
    entityId: warning.id,
    action: 'EXPORT',
    summary: `Advertencia oficial em PDF gerada para ${warning.employee.name}`,
    details: {
      warningId: warning.id,
      employeeId: warning.employeeId,
      storageObjectId: document.storageObject.id,
      syncStatus: document.syncStatus,
      corporateUrl: document.corporateUrl,
    },
  });

  return document;
};

const getSuspensionForPdf = async (suspensionId, companyId) => {
  const suspension = await prisma.suspension.findFirst({
    where: {
      id: Number(suspensionId),
      companyId: Number(companyId),
    },
    include: {
      employee: true,
      company: true,
    },
  });

  if (!suspension) {
    throw new AppError('Suspensao nao encontrada', 404);
  }

  return suspension;
};

export const generateSuspensionPdfService = async ({
  suspensionId,
  companyId,
  user,
  req,
}) => {
  const suspension = await getSuspensionForPdf(suspensionId, companyId);
  const companyName = getCompanyDisplayName(suspension.company);
  const buffer = createOfficialPdfBuffer({
    title: 'Suspensao Oficial',
    subtitle: 'Documento formal de suspensao disciplinar emitido pelo EloSystem.',
    companyName,
    documentCode: `Suspensao #${suspension.id}`,
    meta: [
      ...normalizeEmployeeMeta(suspension.employee),
      { label: 'Inicio', value: formatPdfDate(suspension.startDate) },
      { label: 'Fim', value: formatPdfDate(suspension.endDate) },
      { label: 'Status', value: suspension.status },
    ],
    sections: [
      {
        title: 'Justificativa',
        text: suspension.title,
      },
      {
        title: 'Observacoes',
        text:
          suspension.description ||
          'Registro emitido para ciencia do colaborador e rastreabilidade administrativa.',
      },
      {
        title: 'Orientacao',
        text:
          'O periodo informado deve ser acompanhado pelo RH e pelo gestor responsavel. Alteracoes futuras devem manter trilha de auditoria.',
      },
    ],
    signatures: ['Colaborador', 'Responsavel pelo RH', 'Gestor responsavel'],
  });
  const document = await persistOfficialPdfDocument({
    buffer,
    companyId,
    module: 'suspensions',
    entityType: 'suspension_pdf',
    entityId: suspension.id,
    employeeId: suspension.employeeId,
    user,
    fileName: `suspensao-${suspension.id}-${suspension.employee.name}.pdf`,
  });

  await auditOfficialPdf({
    req,
    user,
    companyId,
    module: 'suspensions',
    entityType: 'suspension_pdf',
    entityId: suspension.id,
    action: 'EXPORT',
    summary: `Suspensao oficial em PDF gerada para ${suspension.employee.name}`,
    details: {
      suspensionId: suspension.id,
      employeeId: suspension.employeeId,
      storageObjectId: document.storageObject.id,
      syncStatus: document.syncStatus,
      corporateUrl: document.corporateUrl,
    },
  });

  return document;
};

export const buildExecutiveReportPdfBuffer = (report) => {
  const rows = (report.rows || []).slice(0, 120).map((row) => {
    const normalized = {};
    (report.columns || []).slice(0, 5).forEach((column) => {
      normalized[column.key] = row[column.key] ?? '-';
    });
    return normalized;
  });
  const columns = (report.columns || []).slice(0, 5).map((column) => ({
    key: column.key,
    label: column.label,
    width: (595.28 - 88) / Math.min((report.columns || []).length || 1, 5),
  }));
  const summaryCards = (report.summaryCards?.length
    ? report.summaryCards
    : Object.entries(report.summary || {}).map(([key, value]) => ({
        title: key.replace(/([A-Z])/g, ' $1'),
        value,
      }))
  )
    .slice(0, 4)
    .map((card) => ({
      label: card.title || card.label,
      value:
        typeof card.value === 'number'
          ? String(card.value)
          : String(card.value || '-'),
    }));
  const filters = Array.isArray(report.appliedFilters)
    ? report.appliedFilters
    : [];

  return createOfficialPdfBuffer({
    title: report.title || 'Relatorio Executivo',
    subtitle: report.description || 'Relatorio gerado a partir dos filtros aplicados no EloSystem.',
    companyName: report.companyName || 'EloSystem',
    documentCode: `Tipo ${report.reportType || 'relatorio'}`,
    meta: [
      { label: 'Periodo', value: report.periodLabel || '-' },
      { label: 'Total de registros', value: String(report.rows?.length || 0) },
      { label: 'Gerado em', value: formatPdfDate(new Date()) },
      { label: 'Filtros aplicados', value: String(filters.length || 0) },
    ],
    summaryCards,
    sections: [
      {
        title: 'Resumo executivo',
        text:
          report.subtitle ||
          'Este relatorio consolida os dados encontrados no periodo e filtros selecionados para apoio a decisao.',
      },
      {
        title: 'Filtros aplicados',
        text:
          filters.map((filter) => `${filter.label}: ${filter.value}`).join(' | ') ||
          'Nenhum filtro complementar aplicado.',
      },
    ],
    tables: [
      {
        title: 'Previa dos dados',
        columns,
        rows,
      },
    ],
  });
};

export const persistReportPdfService = async ({ report, buffer, user, req }) => {
  const document = await persistOfficialPdfDocument({
    buffer,
    companyId: user.companyId,
    module: 'reports',
    entityType: 'report_pdf',
    entityId: null,
    employeeId: null,
    user,
    fileName: `${report.reportType || 'relatorio'}-${Date.now()}.pdf`,
  });

  await auditOfficialPdf({
    req,
    user,
    companyId: user.companyId,
    module: 'reports',
    entityType: 'report_pdf',
    entityId: document.storageObject.id,
    action: 'EXPORT',
    summary: `Relatorio em PDF exportado: ${report.title || report.reportType}`,
    details: {
      reportType: report.reportType,
      filters: report.filters,
      rowCount: report.rows?.length || 0,
      storageObjectId: document.storageObject.id,
      syncStatus: document.syncStatus,
      corporateUrl: document.corporateUrl,
    },
  });

  return document;
};

const summarizePerformanceNarrative = (profile) => {
  const notes = profile.evaluations?.[0]?.notes;
  if (notes) return notes;

  return `A avaliacao consolida jornada, feedbacks, treinamentos e leitura gerencial do periodo, resultando em classificacao ${profile.score.classification.toLowerCase()}.`;
};

export const buildPerformanceEvaluationPdfBuffer = ({ companyName, profile }) => {
  const criteriaRows = [
    {
      criterion: 'Pontualidade',
      score: String(profile.score.criteria.punctuality),
      weight: `${profile.score.weights.punctuality}%`,
      note: 'Chegada, atrasos e regularidade operacional',
    },
    {
      criterion: 'Assiduidade',
      score: String(profile.score.criteria.attendance),
      weight: `${profile.score.weights.attendance}%`,
      note: 'Presenca, faltas e constancia',
    },
    {
      criterion: 'Eficiencia',
      score: String(profile.score.criteria.efficiency),
      weight: `${profile.score.weights.efficiency}%`,
      note: 'Entrega e execucao avaliadas pela gestora',
    },
    {
      criterion: 'Comportamento',
      score: String(profile.score.criteria.behavior),
      weight: `${profile.score.weights.behavior}%`,
      note: 'Postura, disciplina e responsabilidade',
    },
    {
      criterion: 'Feedback interno',
      score: String(profile.score.criteria.peerFeedback),
      weight: `${profile.score.weights.peerFeedback}%`,
      note: 'Percepcao dos colegas no periodo',
    },
    {
      criterion: 'Feedback externo',
      score: String(profile.score.criteria.externalFeedback),
      weight: `${profile.score.weights.externalFeedback}%`,
      note: 'Leitura de clientes e empresas atendidas',
    },
    {
      criterion: 'Treinamentos',
      score: String(profile.score.criteria.trainings),
      weight: `${profile.score.weights.trainings}%`,
      note: 'Capacitacao, aderencia e evolucao',
    },
  ];

  const internalFeedbackRows = (profile.peerFeedbacks || []).slice(0, 6).map((item) => ({
    source: item.reviewerName || 'Nao identificado',
    rating: `${item.score}/5`,
    category: item.category || 'GERAL',
    note: item.comment || '-',
  }));

  const externalFeedbackRows = (profile.externalFeedbacks || []).slice(0, 6).map((item) => ({
    source: item.companyName || 'Cliente',
    rating: `${item.score}/5`,
    category: formatPdfDate(item.feedbackDate),
    note: item.comment || item.serviceContext || '-',
  }));

  const trainingRows = (profile.trainings || []).slice(0, 8).map((item) => ({
    title: item.title || 'Treinamento',
    category: item.category || '-',
    status: item.status || '-',
    date: formatPdfDate(item.completedAt || item.expiresAt),
  }));

  const developmentPlan = profile.developmentPlan || {};

  return createOfficialPdfBuffer({
    title: 'Avaliacao Oficial de Desempenho',
    subtitle:
      'Documento institucional emitido com base nos dados consolidados do modulo Desempenho do EloSystem.',
    companyName,
    documentCode: `Desempenho ${profile.employee.name}`,
    meta: [
      ...normalizeEmployeeMeta(profile.employee),
      { label: 'Periodo avaliado', value: profile.period?.label || '-' },
      { label: 'Nota final', value: String(profile.score.finalScore) },
      { label: 'Classificacao', value: profile.score.classification },
      { label: 'Emitido em', value: formatPdfDate(new Date()) },
    ],
    summaryCards: [
      {
        label: 'Nota final',
        value: String(profile.score.finalScore),
        textColor: [0.08, 0.24, 0.62],
      },
      {
        label: 'Classificacao',
        value: profile.score.classification,
        textColor:
          profile.score.classification === 'EXCELENTE'
            ? [0.02, 0.47, 0.28]
            : profile.score.classification === 'CRITICO'
            ? [0.70, 0.10, 0.10]
            : [0.72, 0.38, 0.04],
      },
      {
        label: 'Feedbacks',
        value: String(
          (profile.peerFeedbacks?.length || 0) +
            (profile.externalFeedbacks?.length || 0)
        ),
      },
      {
        label: 'Treinamentos concluidos',
        value: String(profile.score.operationalBase.completedTrainings || 0),
        textColor: [0.02, 0.47, 0.28],
      },
    ],
    sections: [
      {
        title: 'Resumo executivo',
        text: summarizePerformanceNarrative(profile),
      },
      {
        title: 'Base automatica do periodo',
        items: [
          {
            label: 'Atrasos consolidados',
            value: `${profile.score.operationalBase.delayMinutes || 0} min`,
          },
          {
            label: 'Faltas consolidadas',
            value: `${profile.score.operationalBase.absenceMinutes || 0} min`,
          },
          {
            label: 'Horas extras',
            value: `${profile.score.operationalBase.overtimeMinutes || 0} min`,
          },
          {
            label: 'Advertencias / suspensoes',
            value: `${profile.score.operationalBase.warningCount || 0} / ${
              profile.score.operationalBase.suspensionCount || 0
            }`,
          },
        ],
      },
      {
        title: 'Pontos fortes',
        text: developmentPlan.strengths || 'Nao informado na avaliacao atual.',
      },
      {
        title: 'Pontos de atencao',
        text:
          developmentPlan.attentionPoints ||
          'Nao informado na avaliacao atual.',
      },
      {
        title: 'Plano de desenvolvimento',
        text:
          developmentPlan.developmentPlan ||
          'Nao ha plano formal registrado para o periodo.',
      },
      {
        title: 'Recomendacao gerencial',
        text:
          developmentPlan.recommendation ||
          'Sem recomendacao adicional registrada.',
      },
    ],
    tables: [
      {
        title: 'Criterios ponderados',
        columns: [
          { key: 'criterion', label: 'Criterio', width: 140 },
          { key: 'score', label: 'Nota', width: 65 },
          { key: 'weight', label: 'Peso', width: 65 },
          { key: 'note', label: 'Leitura gerencial', width: 281.28 },
        ],
        rows: criteriaRows,
      },
      {
        title: 'Feedback interno',
        columns: [
          { key: 'source', label: 'Origem', width: 125 },
          { key: 'rating', label: 'Nota', width: 60 },
          { key: 'category', label: 'Categoria', width: 95 },
          { key: 'note', label: 'Comentario', width: 271.28 },
        ],
        rows: internalFeedbackRows,
      },
      {
        title: 'Feedback externo',
        columns: [
          { key: 'source', label: 'Empresa / cliente', width: 125 },
          { key: 'rating', label: 'Nota', width: 60 },
          { key: 'category', label: 'Data', width: 95 },
          { key: 'note', label: 'Comentario / contexto', width: 271.28 },
        ],
        rows: externalFeedbackRows,
      },
      {
        title: 'Treinamentos relevantes',
        columns: [
          { key: 'title', label: 'Treinamento', width: 210 },
          { key: 'category', label: 'Categoria', width: 120 },
          { key: 'status', label: 'Status', width: 90 },
          { key: 'date', label: 'Data', width: 131.28 },
        ],
        rows: trainingRows,
      },
    ],
    signatures: ['Gestora / RH', 'Colaborador', 'Diretoria / Ciencia'],
  });
};

export const generatePerformanceEvaluationPdfService = async ({
  employeeId,
  companyId,
  user,
  req,
  filters = {},
}) => {
  const payload = await getPerformancePdfPayloadService(
    companyId,
    employeeId,
    filters
  );
  const companyName = getCompanyDisplayName(payload.company || {});
  const buffer = buildPerformanceEvaluationPdfBuffer({
    companyName,
    profile: payload.profile,
  });
  const fileName = `avaliacao-desempenho-${payload.profile.employee.name}-${Date.now()}.pdf`;
  const document = await persistOfficialPdfDocument({
    buffer,
    companyId,
    module: 'performance',
    entityType: 'performance_pdf',
    entityId: payload.profile.employee.id,
    employeeId: payload.profile.employee.id,
    user,
    fileName,
  });

  await auditOfficialPdf({
    req,
    user,
    companyId,
    module: 'performance',
    entityType: 'performance_pdf',
    entityId: payload.profile.employee.id,
    action: 'EXPORT',
    summary: `PDF oficial de desempenho gerado para ${payload.profile.employee.name}`,
    details: {
      employeeId: payload.profile.employee.id,
      periodStart: payload.period.periodStart,
      periodEnd: payload.period.periodEnd,
      finalScore: payload.profile.score.finalScore,
      classification: payload.profile.score.classification,
      storageObjectId: document.storageObject.id,
      syncStatus: document.syncStatus,
      corporateUrl: document.corporateUrl,
    },
  });

  return document;
};

export const getOfficialPdfStreamService = async ({
  storageObjectId,
  companyId,
  user,
  req,
  download = false,
}) => {
  const storageObject = await prisma.storageObject.findFirst({
    where: {
      id: Number(storageObjectId),
      companyId: Number(companyId),
      mimeType: 'application/pdf',
    },
  });

  if (!storageObject) {
    throw new AppError('PDF nao encontrado', 404);
  }

  const requiredPermission =
    PDF_READ_PERMISSION_BY_MODULE[storageObject.module] || 'documents.read';

  if (!hasPermission(user, requiredPermission)) {
    await createAuditLog({
      req,
      user,
      companyId,
      module: storageObject.module || 'documents',
      entityType: storageObject.entityType || 'official_pdf',
      entityId: storageObject.entityId || storageObject.id,
      action: 'ACCESS_DENIED',
      severity: 'CRITICAL',
      summary: `Acesso negado ao PDF oficial: ${storageObject.fileName}`,
      details: {
        storageObjectId: storageObject.id,
        requiredPermission,
      },
    }).catch(() => null);

    throw new AppError('Acesso negado para este PDF', 403);
  }

  const resolved = resolveFileReference({
    moduleKey: 'official-pdfs',
    filename: storageObject.storedName,
    storedPath: storageObject.localFallbackPath || storageObject.path,
  });

  if (!resolved) {
    throw new AppError('Arquivo PDF nao encontrado', 404);
  }

  await createAuditLog({
    req,
    user,
    companyId,
    module: storageObject.module || 'documents',
    entityType: storageObject.entityType || 'official_pdf',
    entityId: storageObject.entityId || storageObject.id,
    action: download ? 'DOWNLOAD' : 'VIEW',
    severity: 'INFO',
    summary: download
      ? `Download de PDF oficial: ${storageObject.fileName}`
      : `Visualizacao de PDF oficial: ${storageObject.fileName}`,
    details: {
      storageObjectId: storageObject.id,
      provider: storageObject.provider,
      syncStatus: storageObject.syncStatus,
    },
  }).catch(() => null);

  return {
    absolutePath: resolved.absolutePath,
    fileName: storageObject.fileName || resolved.filename,
    inline: !download,
  };
};
