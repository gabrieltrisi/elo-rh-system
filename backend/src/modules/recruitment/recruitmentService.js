import prisma from '../../prisma/client.js';
import AppError from '../../errors/AppError.js';

const candidateInclude = {
  company: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

const normalizeText = (value) => String(value || '').trim();

const resolveCompanyId = (requestedCompanyId, userCompanyId) => {
  const companyId = Number(requestedCompanyId || userCompanyId);

  if (Number.isNaN(companyId) || companyId <= 0) {
    throw new AppError('Empresa inválida para o candidato', 400);
  }

  return companyId;
};

const normalizeStage = (stage) => {
  const normalized = String(stage || 'TRIAGEM').trim().toUpperCase();
  const allowed = [
    'TRIAGEM',
    'ENTREVISTA',
    'AVALIACAO',
    'APROVACAO',
    'BANCO_TALENTOS',
  ];

  return allowed.includes(normalized) ? normalized : 'TRIAGEM';
};

const formatCandidate = (candidate) => ({
  id: candidate.id,
  fullName: candidate.fullName,
  email: candidate.email || '',
  phone: candidate.phone || '',
  vacancyTitle: candidate.vacancyTitle,
  stage: candidate.stage,
  source: candidate.source || '',
  notes: candidate.notes || '',
  summary: candidate.summary || '',
  score: candidate.score,
  resumeFileName: candidate.resumeFileName || '',
  resumeFileUrl: candidate.resumeFileUrl || '',
  convertedToAdmission: Boolean(candidate.convertedToAdmission),
  createdAt: candidate.createdAt,
  updatedAt: candidate.updatedAt,
  company: candidate.company,
});

export const listCandidatesService = async (filters, userCompanyId) => {
  const companyId =
    filters.companyId && String(filters.companyId).toLowerCase() !== 'todos'
      ? Number(filters.companyId)
      : null;
  const search = normalizeText(filters.search);
  const stage = normalizeText(filters.stage);

  const candidates = await prisma.candidate.findMany({
    where: {
      ...(companyId
        ? {
            companyId,
          }
        : {}),
      ...(stage && stage !== 'TODOS'
        ? {
            stage: normalizeStage(stage),
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                vacancyTitle: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                source: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    },
    include: candidateInclude,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return candidates.map(formatCandidate);
};

export const createCandidateService = async (data, userCompanyId) => {
  const companyId = resolveCompanyId(data.companyId, userCompanyId);

  if (!normalizeText(data.fullName)) {
    throw new AppError('Informe o nome do candidato', 400);
  }

  if (!normalizeText(data.vacancyTitle)) {
    throw new AppError('Informe a vaga do candidato', 400);
  }

  const candidate = await prisma.candidate.create({
    data: {
      companyId,
      fullName: normalizeText(data.fullName),
      email: normalizeText(data.email) || null,
      phone: normalizeText(data.phone) || null,
      vacancyTitle: normalizeText(data.vacancyTitle),
      stage: normalizeStage(data.stage),
      source: normalizeText(data.source) || null,
      notes: normalizeText(data.notes) || null,
      summary: normalizeText(data.summary) || null,
      score:
        data.score !== undefined && data.score !== null && data.score !== ''
          ? Number(data.score)
          : null,
      resumeFileName: data.resumeFileName || null,
      resumeFileUrl: data.resumeFileUrl || null,
    },
    include: candidateInclude,
  });

  return formatCandidate(candidate);
};

export const updateCandidateService = async (
  candidateId,
  data,
  userCompanyId
) => {
  const targetCompanyId =
    data.companyId !== undefined && data.companyId !== null && data.companyId !== ''
      ? resolveCompanyId(data.companyId, userCompanyId)
      : null;

  const existingCandidate = await prisma.candidate.findFirst({
    where: {
      id: Number(candidateId),
      ...(targetCompanyId
        ? {
            companyId: targetCompanyId,
          }
        : {}),
    },
    include: candidateInclude,
  });

  if (!existingCandidate) {
    throw new AppError('Candidato não encontrado', 404);
  }

  const updated = await prisma.candidate.update({
    where: {
      id: Number(candidateId),
    },
    data: {
      fullName:
        data.fullName !== undefined
          ? normalizeText(data.fullName)
          : existingCandidate.fullName,
      email:
        data.email !== undefined
          ? normalizeText(data.email) || null
          : existingCandidate.email,
      phone:
        data.phone !== undefined
          ? normalizeText(data.phone) || null
          : existingCandidate.phone,
      vacancyTitle:
        data.vacancyTitle !== undefined
          ? normalizeText(data.vacancyTitle)
          : existingCandidate.vacancyTitle,
      stage:
        data.stage !== undefined
          ? normalizeStage(data.stage)
          : existingCandidate.stage,
      source:
        data.source !== undefined
          ? normalizeText(data.source) || null
          : existingCandidate.source,
      notes:
        data.notes !== undefined
          ? normalizeText(data.notes) || null
          : existingCandidate.notes,
      summary:
        data.summary !== undefined
          ? normalizeText(data.summary) || null
          : existingCandidate.summary,
      companyId: targetCompanyId || existingCandidate.companyId,
      score:
        data.score !== undefined
          ? data.score === '' || data.score === null
            ? null
            : Number(data.score)
          : existingCandidate.score,
      resumeFileName:
        data.resumeFileName !== undefined
          ? data.resumeFileName || null
          : existingCandidate.resumeFileName,
      resumeFileUrl:
        data.resumeFileUrl !== undefined
          ? data.resumeFileUrl || null
          : existingCandidate.resumeFileUrl,
    },
    include: candidateInclude,
  });

  return formatCandidate(updated);
};

export const deleteCandidateService = async (
  candidateId,
  userCompanyId,
  requestedCompanyId
) => {
  const companyId =
    requestedCompanyId !== undefined &&
    requestedCompanyId !== null &&
    requestedCompanyId !== ''
      ? resolveCompanyId(requestedCompanyId, userCompanyId)
      : null;

  const existingCandidate = await prisma.candidate.findFirst({
    where: {
      id: Number(candidateId),
      ...(companyId
        ? {
            companyId,
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (!existingCandidate) {
    throw new AppError('Candidato não encontrado', 404);
  }

  await prisma.candidate.delete({
    where: {
      id: Number(candidateId),
    },
  });
};
