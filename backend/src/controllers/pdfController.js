import {
  generatePerformanceEvaluationPdfService,
  generatePayslipPdfService,
  generateSuspensionPdfService,
  generateWarningPdfService,
  getOfficialPdfStreamService,
} from '../services/officialPdfService.js';

export const generatePayslipPdf = async (req, res, next) => {
  try {
    const pdf = await generatePayslipPdfService({
      runId: req.params.runId,
      employeeId: req.params.employeeId,
      companyId: req.user.companyId,
      user: req.user,
      req,
    });

    return res.status(201).json({
      message: 'Holerite em PDF gerado com sucesso',
      pdf,
    });
  } catch (error) {
    return next(error);
  }
};

export const generateWarningPdf = async (req, res, next) => {
  try {
    const pdf = await generateWarningPdfService({
      warningId: req.params.id,
      companyId: req.user.companyId,
      user: req.user,
      req,
    });

    return res.status(201).json({
      message: 'Advertencia oficial em PDF gerada com sucesso',
      pdf,
    });
  } catch (error) {
    return next(error);
  }
};

export const generateSuspensionPdf = async (req, res, next) => {
  try {
    const pdf = await generateSuspensionPdfService({
      suspensionId: req.params.id,
      companyId: req.user.companyId,
      user: req.user,
      req,
    });

    return res.status(201).json({
      message: 'Suspensao oficial em PDF gerada com sucesso',
      pdf,
    });
  } catch (error) {
    return next(error);
  }
};

export const generatePerformanceEvaluationPdf = async (req, res, next) => {
  try {
    const pdf = await generatePerformanceEvaluationPdfService({
      employeeId: req.params.employeeId,
      companyId: req.user.companyId,
      user: req.user,
      req,
      filters: req.body || {},
    });

    return res.status(201).json({
      message: 'PDF oficial de desempenho gerado com sucesso',
      pdf,
    });
  } catch (error) {
    return next(error);
  }
};

const sendOfficialPdf = async (req, res, next, download = false) => {
  try {
    const payload = await getOfficialPdfStreamService({
      storageObjectId: req.params.storageObjectId,
      companyId: req.user.companyId,
      user: req.user,
      req,
      download,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${payload.inline ? 'inline' : 'attachment'}; filename="${payload.fileName}"`
    );

    return res.sendFile(payload.absolutePath);
  } catch (error) {
    return next(error);
  }
};

export const viewOfficialPdf = (req, res, next) =>
  sendOfficialPdf(req, res, next, false);

export const downloadOfficialPdf = (req, res, next) =>
  sendOfficialPdf(req, res, next, true);
