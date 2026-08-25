import mime from 'mime-types';
import AppError from '../../errors/AppError.js';
import { createAuditLog } from '../../services/auditService.js';
import {
  createEmployeeTrainingService,
  deleteEmployeeTrainingService,
  getAllEmployeeTrainingsService,
  getCertificateByPermalinkService,
  getTrainingAttachmentStreamService,
  updateEmployeeTrainingService,
} from './trainingService.js';

export const getAllTrainings = async (req, res, next) => {
  try {
    const payload = await getAllEmployeeTrainingsService(
      req.query,
      req.user?.companyId
    );

    return res.status(200).json({
      message: 'Certificados e capacitacoes carregados com sucesso',
      ...payload,
    });
  } catch (error) {
    return next(error);
  }
};

export const createTraining = async (req, res, next) => {
  try {
    const training = await createEmployeeTrainingService(
      {
        ...req.body,
        certificateFile: req.file || null,
      },
      req.user?.companyId,
      req.user?.userId
    );

    await createAuditLog({
      req,
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: training.id,
      action: 'CREATE',
      summary: `Certificado criado para ${training.employee.name}`,
      details: {
        employeeId: training.employee.id,
        title: training.training.title,
        validityStatus: training.validityStatus,
        attachment: Boolean(training.attachment),
      },
      after: training,
    });

    if (req.file) {
      await createAuditLog({
        req,
        module: 'trainings',
        entityType: 'training_certificate_file',
        entityId: training.id,
        action: 'UPLOAD',
        summary: `Anexo de certificado enviado para ${training.employee.name}`,
        details: {
          employeeId: training.employee.id,
          title: training.training.title,
          fileName: training.attachment?.fileName || req.file.originalname,
          syncStatus: training.attachment?.syncStatus || 'LOCAL_ONLY',
        },
      });
    }

    return res.status(201).json({
      message: 'Certificado registrado com sucesso',
      training,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateTraining = async (req, res, next) => {
  try {
    const recordId = Number(req.params.id);

    if (Number.isNaN(recordId)) {
      return next(new AppError('ID do certificado invalido', 400));
    }

    const previousPayload = await getAllEmployeeTrainingsService(
      { companyId: req.body.companyId || req.user?.companyId },
      req.user?.companyId
    ).catch(() => null);

    const training = await updateEmployeeTrainingService(
      recordId,
      {
        ...req.body,
        certificateFile: req.file || null,
      },
      req.user?.companyId,
      req.user?.userId
    );

    await createAuditLog({
      req,
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: training.id,
      action: 'UPDATE',
      summary: `Certificado atualizado para ${training.employee.name}`,
      details: {
        employeeId: training.employee.id,
        title: training.training.title,
        validityStatus: training.validityStatus,
        attachment: Boolean(training.attachment),
      },
      before: previousPayload?.trainings?.find((item) => item.id === training.id) || null,
      after: training,
    });

    if (req.file) {
      await createAuditLog({
        req,
        module: 'trainings',
        entityType: 'training_certificate_file',
        entityId: training.id,
        action: 'UPLOAD',
        summary: `Anexo de certificado atualizado para ${training.employee.name}`,
        details: {
          employeeId: training.employee.id,
          title: training.training.title,
          fileName: training.attachment?.fileName || req.file.originalname,
          syncStatus: training.attachment?.syncStatus || 'LOCAL_ONLY',
        },
      });
    }

    return res.status(200).json({
      message: 'Certificado atualizado com sucesso',
      training,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteTraining = async (req, res, next) => {
  try {
    const recordId = Number(req.params.id);

    if (Number.isNaN(recordId)) {
      return next(new AppError('ID do certificado invalido', 400));
    }

    const previous = await deleteEmployeeTrainingService(
      recordId,
      req.user?.companyId,
      req.query.companyId
    );

    await createAuditLog({
      req,
      module: 'trainings',
      entityType: 'training_certificate',
      entityId: previous.id,
      action: 'SOFT_DELETE',
      severity: 'WARNING',
      summary: `Certificado removido de ${previous.employee.name}`,
      details: {
        employeeId: previous.employee.id,
        title: previous.training.title,
      },
      before: previous,
    });

    return res.status(200).json({
      message: 'Certificado removido com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};

const sendAttachment = async (req, res, next, download = false) => {
  try {
    const payload = await getTrainingAttachmentStreamService(
      req.params.id,
      req.user?.companyId,
      download
    );

    await createAuditLog({
      req,
      module: 'trainings',
      entityType: 'training_certificate_file',
      entityId: payload.record.id,
      action: download ? 'DOWNLOAD' : 'VIEW',
      summary: download
        ? `Download de certificado de ${payload.record.employee.name}`
        : `Visualizacao de certificado de ${payload.record.employee.name}`,
      details: {
        employeeId: payload.record.employee.id,
        title: payload.record.training.title,
        storageObjectId: payload.record.attachment?.storageObjectId || null,
        syncStatus: payload.record.attachment?.syncStatus || 'LOCAL_ONLY',
      },
    });

    res.setHeader(
      'Content-Type',
      payload.mimeType || mime.lookup(payload.fileName) || 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `${payload.inline ? 'inline' : 'attachment'}; filename="${payload.fileName}"`
    );

    return res.sendFile(payload.absolutePath);
  } catch (error) {
    return next(error);
  }
};

export const viewTrainingAttachment = (req, res, next) =>
  sendAttachment(req, res, next, false);

export const downloadTrainingAttachment = (req, res, next) =>
  sendAttachment(req, res, next, true);

export const openCertificatePermalink = async (req, res, next) => {
  try {
    const record = await getCertificateByPermalinkService(req.params.permalink);

    if (!record.certificateFileUrl) {
      return next(new AppError('Arquivo do certificado nao encontrado', 404));
    }

    return res.redirect(record.certificateFileUrl);
  } catch (error) {
    return next(error);
  }
};
