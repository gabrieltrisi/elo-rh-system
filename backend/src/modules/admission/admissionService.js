import crypto from 'crypto';
import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { sendAdmissionInviteEmail } from '../../services/emailService.js';

const REQUIRED_DOCUMENT_CATEGORIES = [
  'RG',
  'CPF',
  'Comprovante de Residência',
  'Carteira de Trabalho',
  'Dados Bancários',
  'ASO',
  'Contrato',
];

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const parseRequiredDate = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} é obrigatório`, 400);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} inválido`, 400);
  }

  return parsed;
};

const parseNullableDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
};

const buildPublicLink = (token) => {
  const baseUrl =
    process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5173';

  return `${baseUrl}/admission/${token}`;
};

const buildWhatsAppLink = ({ employeeName, phone, publicLink }) => {
  const cleanPhone = String(phone || '').replace(/\D/g, '');

  if (!cleanPhone) return null;

  const message = encodeURIComponent(
    `Olá, ${employeeName || 'colaborador'}! Seu formulário de pré-admissão já está disponível. Acesse pelo link: ${publicLink}`
  );

  return `https://wa.me/${cleanPhone}?text=${message}`;
};

export const createAdmissionFormService = async (
  { employeeId, expiresAt, notes },
  companyId
) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: Number(employeeId),
      companyId: Number(companyId),
    },
  });

  if (!employee) {
    throw new AppError('Colaborador não encontrado para esta empresa', 404);
  }

  const existing = await prisma.admissionForm.findFirst({
    where: {
      employeeId: Number(employeeId),
      companyId: Number(companyId),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (existing && existing.status !== 'CONCLUIDO') {
    return {
      admissionForm: existing,
      publicLink: buildPublicLink(existing.token),
      reused: true,
    };
  }

  const token = crypto.randomBytes(24).toString('hex');

  const admissionForm = await prisma.admissionForm.create({
    data: {
      employeeId: Number(employeeId),
      companyId: Number(companyId),
      token,
      status: 'PENDENTE',
      notes: normalizeNullableString(notes),
      sentAt: new Date(),
      expiresAt: parseNullableDate(expiresAt),
    },
    include: {
      employee: true,
    },
  });

  return {
    admissionForm,
    publicLink: buildPublicLink(admissionForm.token),
    reused: false,
  };
};

export const getAllAdmissionFormsService = async (companyId) => {
  return await prisma.admissionForm.findMany({
    where: {
      companyId: Number(companyId),
    },
    include: {
      employee: true,
      submissions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getAdmissionFormByTokenService = async (token) => {
  const admissionForm = await prisma.admissionForm.findUnique({
    where: {
      token,
    },
    include: {
      employee: true,
      submissions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!admissionForm) {
    throw new AppError('Formulário de pré-admissão não encontrado', 404);
  }

  if (
    admissionForm.expiresAt &&
    new Date(admissionForm.expiresAt) < new Date()
  ) {
    throw new AppError('Este link de pré-admissão expirou', 410);
  }

  return admissionForm;
};

export const submitAdmissionFormService = async (token, data, files = []) => {
  const admissionForm = await prisma.admissionForm.findUnique({
    where: {
      token,
    },
    include: {
      employee: true,
    },
  });

  if (!admissionForm) {
    throw new AppError('Formulário de pré-admissão não encontrado', 404);
  }

  if (
    admissionForm.expiresAt &&
    new Date(admissionForm.expiresAt) < new Date()
  ) {
    throw new AppError('Este link de pré-admissão expirou', 410);
  }

  const submission = await prisma.admissionFormSubmission.create({
    data: {
      admissionFormId: admissionForm.id,
      fullName: data.name,
      cpf: data.cpf,
      birthDate: parseRequiredDate(data.birthDate, 'Data de nascimento'),
      maritalStatus: data.maritalStatus,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      admissionDate: parseRequiredDate(data.admissionDate, 'Data de admissão'),
      shirtSize: normalizeNullableString(data.shirtSize),
      pantsSize: normalizeNullableString(data.pantsSize),
      bootSize: normalizeNullableString(data.bootSize),
      notes: normalizeNullableString(data.notes),
      address: normalizeNullableString(data.address),
      bankName: normalizeNullableString(data.bankName),
      bankAgency: normalizeNullableString(data.bankAgency),
      bankAccount: normalizeNullableString(data.bankAccount),
      pixKey: normalizeNullableString(data.pixKey),
    },
  });

  await prisma.employee.update({
    where: {
      id: admissionForm.employeeId,
    },
    data: {
      name: data.name,
      cpf: data.cpf,
      birthDate: parseRequiredDate(data.birthDate, 'Data de nascimento'),
      maritalStatus: data.maritalStatus,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      admissionDate: parseRequiredDate(data.admissionDate, 'Data de admissão'),
      shirtSize: normalizeNullableString(data.shirtSize),
      pantsSize: normalizeNullableString(data.pantsSize),
      bootSize: normalizeNullableString(data.bootSize),
      notes: normalizeNullableString(data.notes),
    },
  });

  if (files.length > 0) {
    const docsToCreate = files.map((file) => {
      const category =
        REQUIRED_DOCUMENT_CATEGORIES.find((item) =>
          file.fieldname.toLowerCase().includes(item.toLowerCase())
        ) || file.fieldname;

      return {
        title: category,
        description: 'Enviado pelo colaborador no formulário',
        category,
        fileName: file.originalname,
        fileUrl: `/uploads/admission/${file.filename}`,
        employeeId: admissionForm.employeeId,
        companyId: admissionForm.companyId,
      };
    });

    await prisma.document.createMany({
      data: docsToCreate,
    });
  }

  const onboarding = await prisma.onboarding.findUnique({
    where: {
      employeeId: admissionForm.employeeId,
    },
  });

  if (onboarding) {
    await prisma.onboarding.update({
      where: {
        id: onboarding.id,
      },
      data: {
        status:
          onboarding.status === 'PENDENTE' ? 'EM_ANDAMENTO' : onboarding.status,
        notes: normalizeNullableString(
          `${onboarding.notes || ''}\nFormulário preenchido pelo colaborador`
        ),
      },
    });
  }

  const updatedAdmissionForm = await prisma.admissionForm.update({
    where: {
      id: admissionForm.id,
    },
    data: {
      status: 'RESPONDIDO',
      completedAt: new Date(),
    },
    include: {
      employee: true,
      submissions: true,
    },
  });

  return {
    admissionForm: updatedAdmissionForm,
    submission,
  };
};

export const sendAdmissionInviteService = async (
  admissionFormId,
  companyId
) => {
  const admissionForm = await prisma.admissionForm.findFirst({
    where: {
      id: Number(admissionFormId),
      companyId: Number(companyId),
    },
    include: {
      employee: true,
    },
  });

  if (!admissionForm) {
    throw new AppError('Formulário de pré-admissão não encontrado', 404);
  }

  const publicLink = buildPublicLink(admissionForm.token);
  const whatsappLink = buildWhatsAppLink({
    employeeName: admissionForm.employee?.name,
    phone: admissionForm.employee?.phone,
    publicLink,
  });

  if (admissionForm.employee?.email) {
    await sendAdmissionInviteEmail({
      to: admissionForm.employee.email,
      employeeName: admissionForm.employee.name,
      publicLink,
    });
  }

  const updated = await prisma.admissionForm.update({
    where: {
      id: admissionForm.id,
    },
    data: {
      sentAt: new Date(),
      status:
        admissionForm.status === 'PENDENTE' ? 'ENVIADO' : admissionForm.status,
    },
    include: {
      employee: true,
    },
  });

  return {
    admissionForm: updated,
    publicLink,
    whatsappLink,
  };
};
