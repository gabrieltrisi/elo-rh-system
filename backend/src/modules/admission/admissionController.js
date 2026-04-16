import AppError from '../../errors/AppError.js';
import {
  createAdmissionFormService,
  getAllAdmissionFormsService,
  getAdmissionFormByTokenService,
  submitAdmissionFormService,
  sendAdmissionInviteService,
} from './admissionService.js';

export const createAdmissionForm = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { employeeId, expiresAt, notes } = req.body;

    if (!employeeId) {
      return next(new AppError('Selecione o colaborador', 400));
    }

    const result = await createAdmissionFormService(
      {
        employeeId,
        expiresAt,
        notes,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: result.reused
        ? 'Link de pré-admissão já existente'
        : 'Link de pré-admissão criado com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllAdmissionForms = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const admissionForms = await getAllAdmissionFormsService(
      req.user.companyId
    );

    return res.status(200).json({
      message: 'Formulários de pré-admissão encontrados com sucesso',
      admissionForms,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdmissionFormByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return next(new AppError('Token não informado', 400));
    }

    const admissionForm = await getAdmissionFormByTokenService(token);

    return res.status(200).json({
      message: 'Formulário de pré-admissão carregado com sucesso',
      admissionForm,
    });
  } catch (error) {
    return next(error);
  }
};

export const submitAdmissionForm = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return next(new AppError('Token não informado', 400));
    }

    const requiredFields = [
      'name',
      'cpf',
      'birthDate',
      'maritalStatus',
      'email',
      'phone',
      'role',
      'department',
      'admissionDate',
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return next(
          new AppError(`Campo obrigatório não informado: ${field}`, 400)
        );
      }
    }

    const result = await submitAdmissionFormService(
      token,
      req.body,
      req.files || []
    );

    return res.status(201).json({
      message: 'Formulário de pré-admissão enviado com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const sendAdmissionInvite = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;

    if (!id) {
      return next(new AppError('ID do formulário não informado', 400));
    }

    const result = await sendAdmissionInviteService(id, req.user.companyId);

    return res.status(200).json({
      message: 'Convite de pré-admissão preparado com sucesso',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};
