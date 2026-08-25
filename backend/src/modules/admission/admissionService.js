import crypto from 'crypto';
import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';
import { sendAdmissionInviteEmail } from '../../services/emailService.js';
import { buildUploadedFileUrl } from '../../utils/filePath.js';
import { registerManagedFileService } from '../../services/storageIntegrationService.js';

const CONTRACT_TYPES = [
  'CLT',
  'TERCEIRIZADO',
  'ESTAGIO',
  'JOVEM_APRENDIZ',
  'PJ',
  'TEMPORARIO',
  'INTERMITENTE',
  'AUTONOMO',
];

const REQUIRED_DOCUMENT_CATEGORIES = [
  'Foto Digital / Crachá',
  'RG (Frente)',
  'RG (Verso)',
  'CPF',
  'Certidão de Nascimento',
  'Certidão de Casamento',
  'Título de Eleitor',
  'Comprovante de Residência',
  'Histórico Escolar',
  'Comprovante de Matrícula',
  'Reservista / Dispensa',
  'CNH',
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
    if (String(fieldName || '').toLowerCase().includes('admiss')) {
      return new Date();
    }
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

const resolveSubmissionRole = (dataRole, candidateRole) => {
  return (
    normalizeNullableString(dataRole) ||
    normalizeNullableString(candidateRole) ||
    'Cargo a confirmar'
  );
};

const resolveSubmissionDepartment = (dataDepartment) => {
  return normalizeNullableString(dataDepartment) || 'A definir pelo RH';
};

const resolveSubmissionAdmissionDate = (dataAdmissionDate) => {
  return parseNullableDate(dataAdmissionDate) || new Date();
};

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

const ensureValidContractType = (contractType) => {
  if (!contractType) {
    throw new AppError('Tipo de contrato é obrigatório', 400);
  }

  if (!CONTRACT_TYPES.includes(contractType)) {
    throw new AppError('Tipo de contrato inválido', 400);
  }
};

const buildPublicLink = (token) => {
  const baseUrl =
    process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5173';

  return `${baseUrl}/admission/${token}`;
};

const buildWhatsAppLink = ({ candidateName, phone, publicLink }) => {
  const cleanPhone = String(phone || '').replace(/\D/g, '');

  if (!cleanPhone) return null;

  const message = encodeURIComponent(
    `Olá, ${candidateName || 'candidato'}! Seu formulário de pré-admissão já está disponível. Acesse pelo link: ${publicLink}`
  );

  return `https://wa.me/${cleanPhone}?text=${message}`;
};

const resolveDocumentCategory = (fieldName) => {
  const normalized = String(fieldName || '').toLowerCase();

  if (normalized.includes('photo') || normalized.includes('foto')) {
    return 'Foto Digital / Crachá';
  }

  if (normalized.includes('rgfront') || normalized.includes('rgfrente')) {
    return 'RG (Frente)';
  }

  if (normalized.includes('rgback') || normalized.includes('rgverso')) {
    return 'RG (Verso)';
  }

  if (normalized.includes('cpf')) {
    return 'CPF';
  }

  if (
    normalized.includes('birthcertificate') ||
    normalized.includes('certidaonascimento')
  ) {
    return 'Certidão de Nascimento';
  }

  if (
    normalized.includes('marriagecertificate') ||
    normalized.includes('certidaocasamento')
  ) {
    return 'Certidão de Casamento';
  }

  if (normalized.includes('votertitle') || normalized.includes('titulo')) {
    return 'Título de Eleitor';
  }

  if (normalized.includes('residence') || normalized.includes('residencia')) {
    return 'Comprovante de Residência';
  }

  if (
    normalized.includes('schoolhistory') ||
    normalized.includes('historico')
  ) {
    return 'Histórico Escolar';
  }

  if (
    normalized.includes('enrollmentproof') ||
    normalized.includes('matricula')
  ) {
    return 'Comprovante de Matrícula';
  }

  if (
    normalized.includes('military') ||
    normalized.includes('reservista') ||
    normalized.includes('dispensa')
  ) {
    return 'Reservista / Dispensa';
  }

  if (normalized.includes('cnh')) {
    return 'CNH';
  }

  if (normalized.includes('bankdata') || normalized.includes('banco')) {
    return 'Dados Bancários';
  }

  if (normalized.includes('aso')) {
    return 'ASO';
  }

  if (normalized.includes('contract') || normalized.includes('contrato')) {
    return 'Contrato';
  }

  return fieldName;
};

const findCandidateByReference = async ({
  companyId,
  fullName,
  email,
  phone,
}) => {
  const normalizedEmail = normalizeNullableString(email);
  const normalizedPhone = normalizeNullableString(phone);

  return await prisma.admissionCandidate.findFirst({
    where: {
      companyId: Number(companyId),
      OR: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        { fullName: String(fullName).trim() },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createAdmissionFormService = async (
  { fullName, email, phone, desiredPosition, contractType, expiresAt, notes },
  companyId
) => {
  if (!fullName || String(fullName).trim().length < 3) {
    throw new AppError('Nome completo é obrigatório', 400);
  }

  if (!phone || String(phone).trim().length < 8) {
    throw new AppError('Telefone é obrigatório', 400);
  }

  if (!desiredPosition || String(desiredPosition).trim().length < 2) {
    throw new AppError('Vaga desejada é obrigatória', 400);
  }

  ensureValidContractType(contractType);

  const parsedExpiresAt = parseNullableDate(expiresAt);
  const normalizedEmail = normalizeNullableString(email);
  const normalizedNotes = normalizeNullableString(notes);

  let candidate = await findCandidateByReference({
    companyId,
    fullName,
    email,
    phone,
  });

  if (!candidate) {
    candidate = await prisma.admissionCandidate.create({
      data: {
        companyId: Number(companyId),
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        desiredPosition: String(desiredPosition).trim(),
        contractType,
        status: 'CADASTRADO',
        notes: normalizedNotes,
      },
    });
  } else {
    candidate = await prisma.admissionCandidate.update({
      where: {
        id: candidate.id,
      },
      data: {
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        desiredPosition: String(desiredPosition).trim(),
        contractType,
        notes: normalizedNotes,
      },
    });
  }

  const existing = await prisma.admissionForm.findFirst({
    where: {
      candidateId: candidate.id,
      companyId: Number(companyId),
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      candidate: true,
    },
  });

  if (existing) {
    const existingExpired = isExpired(existing.expiresAt);
    const lockStatuses = [
      'PENDENTE',
      'ENVIADO',
      'AGUARDANDO_APROVACAO',
      'RESPONDIDO',
      'APROVADO',
    ];

    if (!existingExpired && lockStatuses.includes(existing.status)) {
      return {
        admissionForm: existing,
        publicLink: buildPublicLink(existing.token),
        reused: true,
      };
    }

    if (
      existingExpired ||
      ['CONCLUIDO', 'REPROVADO'].includes(existing.status)
    ) {
      const refreshed = await prisma.admissionForm.create({
        data: {
          candidateId: candidate.id,
          companyId: Number(companyId),
          token: crypto.randomBytes(24).toString('hex'),
          status: 'PENDENTE',
          notes: normalizedNotes,
          expiresAt: parsedExpiresAt,
        },
        include: {
          candidate: true,
        },
      });

      await prisma.admissionCandidate.update({
        where: {
          id: candidate.id,
        },
        data: {
          status: 'CADASTRADO',
        },
      });

      return {
        admissionForm: refreshed,
        publicLink: buildPublicLink(refreshed.token),
        reused: false,
      };
    }
  }

  const token = crypto.randomBytes(24).toString('hex');

  const admissionForm = await prisma.admissionForm.create({
    data: {
      candidateId: candidate.id,
      companyId: Number(companyId),
      token,
      status: 'PENDENTE',
      notes: normalizedNotes,
      expiresAt: parsedExpiresAt,
    },
    include: {
      candidate: true,
    },
  });

  await prisma.admissionCandidate.update({
    where: {
      id: candidate.id,
    },
    data: {
      status: 'CADASTRADO',
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
      candidate: true,
      documents: {
        orderBy: {
          createdAt: 'desc',
        },
      },
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
      candidate: true,
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

  if (isExpired(admissionForm.expiresAt)) {
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
      candidate: true,
    },
  });

  if (!admissionForm) {
    throw new AppError('Formulário de pré-admissão não encontrado', 404);
  }

  if (isExpired(admissionForm.expiresAt)) {
    throw new AppError('Este link de pré-admissão expirou', 410);
  }

  if (
    ['AGUARDANDO_APROVACAO', 'RESPONDIDO', 'APROVADO', 'CONCLUIDO'].includes(
      admissionForm.status
    )
  ) {
    throw new AppError(
      'Este formulário já foi enviado e não aceita novo preenchimento',
      400
    );
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
      role: resolveSubmissionRole(
        data.role,
        admissionForm.candidate?.desiredPosition
      ),
      department: resolveSubmissionDepartment(data.department),
      admissionDate: resolveSubmissionAdmissionDate(data.admissionDate),
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

  await prisma.admissionCandidate.update({
    where: {
      id: admissionForm.candidateId,
    },
    data: {
      fullName: data.name,
      email: normalizeNullableString(data.email),
      phone: data.phone,
      desiredPosition: resolveSubmissionRole(
        data.role,
        admissionForm.candidate?.desiredPosition
      ),
      status: 'AGUARDANDO_APROVACAO',
    },
  });

  if (files.length > 0) {
    const docsToCreate = files.map((file) => {
      const category = resolveDocumentCategory(file.fieldname);

      return {
        title: category,
        description: 'Enviado pelo candidato no formulário de pré-admissão',
        category,
        fileName: file.originalname,
        fileUrl: buildUploadedFileUrl(file),
        candidateId: admissionForm.candidateId,
        admissionFormId: admissionForm.id,
        companyId: admissionForm.companyId,
      };
    });

    await prisma.$transaction(async (tx) => {
      const createdDocuments = [];

      for (const documentData of docsToCreate) {
        const createdDocument = await tx.document.create({
          data: documentData,
        });

        createdDocuments.push(createdDocument);
      }

      for (let index = 0; index < createdDocuments.length; index += 1) {
        const createdDocument = createdDocuments[index];
        const file = files[index];

        await registerManagedFileService({
          tx,
          companyId: admissionForm.companyId,
          module: 'admission',
          entityType: 'admission_document',
          entityId: createdDocument.id,
          employeeId: null,
          uploadedByUserId: null,
          file,
          originalName: createdDocument.fileName,
          storedPath: createdDocument.fileUrl,
        });
      }
    });
  }

  const updatedAdmissionForm = await prisma.admissionForm.update({
    where: {
      id: admissionForm.id,
    },
    data: {
      status: 'AGUARDANDO_APROVACAO',
      completedAt: new Date(),
    },
    include: {
      candidate: true,
      documents: {
        orderBy: {
          createdAt: 'desc',
        },
      },
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
      candidate: true,
    },
  });

  if (!admissionForm) {
    throw new AppError('Formulário de pré-admissão não encontrado', 404);
  }

  if (isExpired(admissionForm.expiresAt)) {
    throw new AppError(
      'Este link expirou. Gere uma nova pré-admissão para reenviar.',
      400
    );
  }

  const publicLink = buildPublicLink(admissionForm.token);
  const whatsappLink = buildWhatsAppLink({
    candidateName: admissionForm.candidate?.fullName,
    phone: admissionForm.candidate?.phone,
    publicLink,
  });

  if (admissionForm.candidate?.email) {
    await sendAdmissionInviteEmail({
      to: admissionForm.candidate.email,
      candidateName: admissionForm.candidate.fullName,
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
      candidate: true,
    },
  });

  await prisma.admissionCandidate.update({
    where: {
      id: admissionForm.candidateId,
    },
    data: {
      status:
        updated.status === 'ENVIADO'
          ? 'FORMULARIO_ENVIADO'
          : admissionForm.candidate?.status || 'CADASTRADO',
    },
  });

  return {
    admissionForm: updated,
    publicLink,
    whatsappLink,
  };
};

export const startOnboardingFromAdmissionService = async (
  admissionFormId,
  startDate,
  companyId
) => {
  const admissionForm = await prisma.admissionForm.findFirst({
    where: {
      id: Number(admissionFormId),
      companyId: Number(companyId),
    },
    include: {
      candidate: true,
      submissions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!admissionForm) {
    throw new AppError('Pré-admissão não encontrada', 404);
  }

  if (!['AGUARDANDO_APROVACAO', 'RESPONDIDO'].includes(admissionForm.status)) {
    throw new AppError(
      'A pré-admissão ainda não está pronta para aprovação do RH',
      400
    );
  }

  if (!startDate) {
    throw new AppError('Data de início é obrigatória', 400);
  }

  const submission = admissionForm.submissions?.[0];

  if (!submission) {
    throw new AppError(
      'Nenhuma resposta do formulário foi encontrada para este candidato',
      400
    );
  }

  const parsedStartDate = parseRequiredDate(
    startDate,
    'Data de início do colaborador'
  );

  const existingEmployee = await prisma.employee.findFirst({
    where: {
      companyId: Number(companyId),
      OR: [{ cpf: submission.cpf }, { email: submission.email }],
    },
  });

  if (existingEmployee) {
    throw new AppError(
      'Já existe colaborador com este CPF ou e-mail nesta empresa',
      400
    );
  }

  const employee = await prisma.employee.create({
    data: {
      companyId: Number(companyId),
      name: submission.fullName,
      cpf: submission.cpf,
      birthDate: submission.birthDate,
      maritalStatus: submission.maritalStatus,
      email: submission.email,
      phone: submission.phone,
      role:
        normalizeNullableString(submission.role) ||
        admissionForm.candidate.desiredPosition,
      department:
        normalizeNullableString(submission.department) || 'A definir pelo RH',
      contractType: admissionForm.candidate.contractType,
      admissionDate: parsedStartDate,
      status: 'ativo',
      shirtSize: normalizeNullableString(submission.shirtSize),
      pantsSize: normalizeNullableString(submission.pantsSize),
      bootSize: normalizeNullableString(submission.bootSize),
      notes: normalizeNullableString(
        [admissionForm.candidate.notes, submission.notes]
          .filter(Boolean)
          .join(' | ')
      ),
    },
  });

  await prisma.document.updateMany({
    where: {
      companyId: admissionForm.companyId,
      candidateId: admissionForm.candidateId,
    },
    data: {
      employeeId: employee.id,
    },
  });

  await prisma.admissionForm.update({
    where: {
      id: admissionForm.id,
    },
    data: {
      startDate: parsedStartDate,
      approvedAt: new Date(),
      status: 'APROVADO',
    },
  });

  await prisma.admissionCandidate.update({
    where: {
      id: admissionForm.candidateId,
    },
    data: {
      status: 'CONVERTIDO',
    },
  });

  const onboarding = await prisma.onboarding.create({
    data: {
      employeeId: employee.id,
      companyId: admissionForm.companyId,
      status: 'EM_ANDAMENTO',
      welcomeSent: false,
      accessCreated: false,
      startDate: parsedStartDate,
      notes:
        'Onboarding iniciado automaticamente após aprovação da pré-admissão pelo RH',
    },
    include: {
      employee: true,
    },
  });

  return onboarding;
};
