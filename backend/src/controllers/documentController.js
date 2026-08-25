import {
  createDocumentService,
  getAllDocumentsService,
  deleteDocumentService,
} from '../services/documentService.js';
import AppError from '../errors/AppError.js';
import { buildUploadedFileUrl } from '../utils/filePath.js';
import { createAuditLog } from '../services/auditService.js';

export const createDocument = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuario nao identificada', 401));
    }

    const { title, description, category, employeeId } = req.body;

    if (!title || !category) {
      return next(new AppError('Titulo e categoria sao obrigatorios', 400));
    }

    if (!req.file) {
      return next(new AppError('Arquivo nao enviado', 400));
    }

    const fileUrl = buildUploadedFileUrl(req.file);

    const document = await createDocumentService(
      {
        title,
        description,
        category,
        employeeId: employeeId ? Number(employeeId) : null,
        fileName: req.file.originalname,
        fileUrl,
      },
      req.user.companyId,
      {
        file: req.file,
        uploadedByUserId: req.user.userId,
      }
    );

    await createAuditLog({
      req,
      module: 'documents',
      entityType: 'document',
      entityId: document.id,
      action: 'UPLOAD',
      severity: 'INFO',
      summary: `Documento "${document.title}" anexado ao EloSystem`,
      after: document,
      details: {
        category: document.category,
        employeeId: document.employeeId,
        fileName: document.fileName,
      },
    });

    return res.status(201).json({
      message: 'Documento cadastrado com sucesso',
      document,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllDocuments = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuario nao identificada', 401));
    }

    const documents = await getAllDocumentsService(req.user.companyId);

    return res.status(200).json({
      message: 'Documentos encontrados com sucesso',
      documents,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuario nao identificada', 401));
    }

    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      return next(new AppError('ID do documento invalido', 400));
    }

    const document = await deleteDocumentService(documentId, req.user.companyId);

    await createAuditLog({
      req,
      module: 'documents',
      entityType: 'document',
      entityId: document.id,
      action: 'DELETE',
      severity: 'WARNING',
      summary: `Documento "${document.title}" removido do EloSystem`,
      before: document,
      details: {
        category: document.category,
        employeeId: document.employeeId,
        fileName: document.fileName,
      },
    });

    return res.status(200).json({
      message: 'Documento excluido com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
