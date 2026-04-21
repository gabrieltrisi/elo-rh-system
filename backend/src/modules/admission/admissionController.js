import AppError from '../../errors/AppError.js';
import {
  createAdmissionFormService,
  getAllAdmissionFormsService,
  getAdmissionFormByTokenService,
  submitAdmissionFormService,
  sendAdmissionInviteService,
  startOnboardingFromAdmissionService,
} from './admissionService.js';

export const createAdmissionForm = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const {
      fullName,
      email,
      phone,
      desiredPosition,
      contractType,
      expiresAt,
      notes,
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return next(new AppError('Nome completo é obrigatório', 400));
    }

    if (!phone || !String(phone).trim()) {
      return next(new AppError('Telefone é obrigatório', 400));
    }

    if (!desiredPosition || !String(desiredPosition).trim()) {
      return next(new AppError('Vaga desejada é obrigatória', 400));
    }

    if (!contractType || !String(contractType).trim()) {
      return next(new AppError('Tipo de contrato é obrigatório', 400));
    }

    const result = await createAdmissionFormService(
      {
        fullName,
        email,
        phone,
        desiredPosition,
        contractType,
        expiresAt,
        notes,
      },
      req.user.companyId
    );

    return res.status(201).json({
      message: result.reused
        ? 'Link de pré-admissão já existente para este candidato'
        : 'Pré-admissão criada com sucesso',
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
      'admissionDate',
    ];

    for (const field of requiredFields) {
      if (!req.body[field] || !String(req.body[field]).trim()) {
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
      message:
        'Formulário enviado com sucesso. Agora ele ficará aguardando aprovação do RH.',
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

export const startOnboardingFromAdmission = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return next(new AppError('Empresa do usuário não identificada', 401));
    }

    const { id } = req.params;
    const { startDate } = req.body;

    if (!id) {
      return next(new AppError('ID da pré-admissão não informado', 400));
    }

    if (!startDate) {
      return next(new AppError('Data de início é obrigatória', 400));
    }

    const onboarding = await startOnboardingFromAdmissionService(
      id,
      startDate,
      req.user.companyId
    );

    return res.status(200).json({
      message:
        'Pré-admissão aprovada com sucesso. Candidato convertido em colaborador e onboarding iniciado.',
      onboarding,
    });
  } catch (error) {
    return next(error);
  }
};
