import { createAuditLog } from '../../services/auditService.js';
import {
  createPerformanceEvaluationService,
  createPerformanceExternalFeedbackService,
  createPerformancePeerFeedbackService,
  getPerformanceDashboardService,
  getPerformanceOptionsService,
} from './performanceService.js';

export const getPerformanceOptions = async (req, res, next) => {
  try {
    const options = await getPerformanceOptionsService(Number(req.user.companyId));
    return res.status(200).json({ options });
  } catch (error) {
    return next(error);
  }
};

export const getPerformanceDashboard = async (req, res, next) => {
  try {
    const performance = await getPerformanceDashboardService(
      Number(req.user.companyId),
      req.query
    );

    return res.status(200).json({ performance });
  } catch (error) {
    return next(error);
  }
};

export const createPerformanceEvaluation = async (req, res, next) => {
  try {
    const evaluation = await createPerformanceEvaluationService({
      companyId: Number(req.user.companyId),
      userId: req.user.userId,
      data: req.body,
    });

    await createAuditLog({
      req,
      module: 'performance',
      entityType: 'performance_evaluation',
      entityId: evaluation.id,
      action: 'CREATE',
      severity: evaluation.classification === 'CRITICO' ? 'WARNING' : 'INFO',
      summary: 'Avaliacao de desempenho registrada',
      details: {
        employeeId: evaluation.employeeId,
        finalScore: evaluation.finalScore,
        classification: evaluation.classification,
        periodStart: evaluation.periodStart,
        periodEnd: evaluation.periodEnd,
      },
    });

    return res.status(201).json({
      message: 'Avaliacao registrada com sucesso',
      evaluation,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPerformancePeerFeedback = async (req, res, next) => {
  try {
    const feedback = await createPerformancePeerFeedbackService({
      companyId: Number(req.user.companyId),
      userId: req.user.userId,
      data: req.body,
    });

    await createAuditLog({
      req,
      module: 'performance',
      entityType: 'peer_feedback',
      entityId: feedback.id,
      action: 'CREATE',
      summary: 'Feedback interno de desempenho registrado',
      details: {
        employeeId: feedback.employeeId,
        reviewerEmployeeId: feedback.reviewerEmployeeId,
        score: feedback.score,
        category: feedback.category,
      },
    });

    return res.status(201).json({
      message: 'Feedback interno registrado com sucesso',
      feedback,
    });
  } catch (error) {
    return next(error);
  }
};

export const createPerformanceExternalFeedback = async (req, res, next) => {
  try {
    const feedback = await createPerformanceExternalFeedbackService({
      companyId: Number(req.user.companyId),
      userId: req.user.userId,
      data: req.body,
    });

    await createAuditLog({
      req,
      module: 'performance',
      entityType: 'external_feedback',
      entityId: feedback.id,
      action: 'CREATE',
      summary: 'Feedback externo de desempenho registrado',
      details: {
        employeeId: feedback.employeeId,
        companyName: feedback.companyName,
        score: feedback.score,
        serviceContext: feedback.serviceContext,
      },
    });

    return res.status(201).json({
      message: 'Feedback externo registrado com sucesso',
      feedback,
    });
  } catch (error) {
    return next(error);
  }
};
