import {
  createCertificateService,
  getCertificatesService,
  updateCertificateStatusService,
  deleteCertificateService,
} from '../services/certificateService.js';
import AppError from '../errors/AppError.js';

export const create = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const {
      employeeId,
      title,
      startDate,
      endDate,
      days,
      status,
      managerNotes,
      fileUrl,
    } = req.body;

    if (!employeeId || !title || !startDate || !endDate || !days) {
      return next(new AppError('Preencha os campos obrigatórios', 400));
    }

    const certificate = await createCertificateService(
      {
        employeeId: Number(employeeId),
        title,
        startDate,
        endDate,
        days: Number(days),
        status: status || 'Registrado',
        managerNotes: managerNotes || null,
        fileUrl: req.file
          ? `/uploads/certificates/${req.file.filename}`
          : fileUrl || null,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: 'Atestado cadastrado com sucesso',
      certificate,
    });
  } catch (error) {
    console.error('ERRO AO CRIAR ATESTADO:', error);
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const certificates = await getCertificatesService(req.user.companyId);

    return res.status(200).json({
      message: 'Atestados encontrados com sucesso',
      certificates,
    });
  } catch (error) {
    console.error('ERRO AO BUSCAR ATESTADOS:', error);
    return next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;
    const { status, managerNotes } = req.body;

    if (!status) {
      return next(new AppError('Status é obrigatório', 400));
    }

    const updated = await updateCertificateStatusService(
      Number(id),
      status,
      managerNotes || null,
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Status do atestado atualizado com sucesso',
      certificate: updated,
    });
  } catch (error) {
    console.error('ERRO AO ATUALIZAR STATUS DO ATESTADO:', error);
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    await deleteCertificateService(Number(id), req.user.companyId);

    return res.status(200).json({
      message: 'Atestado excluído com sucesso',
    });
  } catch (error) {
    console.error('ERRO AO EXCLUIR ATESTADO:', error);
    return next(error);
  }
};
