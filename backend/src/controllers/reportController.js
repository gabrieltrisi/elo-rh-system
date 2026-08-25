import {
  generateReportExcelBuffer,
  generateReportPdfBuffer,
  registerReportExportAudit,
} from '../services/reportExportService.js';
import { persistReportPdfService } from '../services/officialPdfService.js';
import {
  getReportOptions,
  getReportPreviewService,
} from '../services/reportService.js';

const buildFileName = (report, extension) => {
  const safeType = String(report.reportType || 'relatorio').replace(/[^a-z0-9_-]/gi, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safeType}_${timestamp}.${extension}`;
};

export const getReportOptionsController = async (req, res, next) => {
  try {
    const options = await getReportOptions(req.user);

    return res.status(200).json({
      message: 'Opcoes de relatorio carregadas com sucesso',
      options,
    });
  } catch (error) {
    return next(error);
  }
};

export const getReportPreviewController = async (req, res, next) => {
  try {
    const report = await getReportPreviewService(req.query, req.user, req);

    return res.status(200).json({
      message: 'Preview do relatorio gerado com sucesso',
      report,
    });
  } catch (error) {
    return next(error);
  }
};

export const exportReportExcelController = async (req, res, next) => {
  try {
    const report = await getReportPreviewService(req.query, req.user);
    const buffer = generateReportExcelBuffer(report);

    await registerReportExportAudit({
      req,
      report,
      format: 'xlsx',
      user: req.user,
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${buildFileName(report, 'xlsx')}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
};

export const exportReportPdfController = async (req, res, next) => {
  try {
    const report = await getReportPreviewService(req.query, req.user);
    const buffer = generateReportPdfBuffer(report);

    const pdfDocument = await persistReportPdfService({
      req,
      report,
      user: req.user,
      buffer,
    });

    res.setHeader('X-Elo-Storage-Object-Id', String(pdfDocument.storageObject.id));
    if (pdfDocument.corporateUrl) {
      res.setHeader('X-Elo-Corporate-Url', encodeURIComponent(pdfDocument.corporateUrl));
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${buildFileName(report, 'pdf')}"`
    );
    res.setHeader('Content-Type', 'application/pdf');

    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
};
