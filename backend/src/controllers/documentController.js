import {
  createDocumentService,
  getAllDocumentsService,
  deleteDocumentService,
} from '../services/documentService.js';
import AppError from '../errors/AppError.js';

export const createDocument = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { title, description, category, employeeId } = req.body;

    if (!title || !category) {
      return next(new AppError('Título e categoria são obrigatórios', 400));
    }

    if (!req.file) {
      return next(new AppError('Arquivo não enviado', 400));
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const document = await createDocumentService(
      {
        title,
        description,
        category,
        employeeId: employeeId ? Number(employeeId) : null,
        fileName: req.file.originalname,
        fileUrl,
      },
      req.user.companyId
    );

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
      return next(new AppError('Empresa do usuário não identificada', 401));
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
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      return next(new AppError('ID do documento inválido', 400));
    }

    await deleteDocumentService(documentId, req.user.companyId);

    return res.status(200).json({
      message: 'Documento excluído com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
