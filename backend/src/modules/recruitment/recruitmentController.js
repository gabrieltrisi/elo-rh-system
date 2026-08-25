import AppError from '../../errors/AppError.js';
import {
  createCandidateService,
  deleteCandidateService,
  listCandidatesService,
  updateCandidateService,
} from './recruitmentService.js';
import { buildUploadedFileUrl } from '../../utils/filePath.js';

export const listCandidates = async (req, res, next) => {
  try {
    const candidates = await listCandidatesService(req.query, req.user?.companyId);

    return res.status(200).json({
      message: 'Candidatos carregados com sucesso',
      candidates,
    });
  } catch (error) {
    return next(error);
  }
};

export const createCandidate = async (req, res, next) => {
  try {
    const candidate = await createCandidateService(
      {
        ...req.body,
        resumeFileName: req.file?.originalname || null,
        resumeFileUrl: buildUploadedFileUrl(req.file),
      },
      req.user?.companyId
    );

    return res.status(201).json({
      message: 'Candidato cadastrado com sucesso',
      candidate,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCandidate = async (req, res, next) => {
  try {
    const candidateId = Number(req.params.id);

    if (Number.isNaN(candidateId)) {
      return next(new AppError('ID do candidato inválido', 400));
    }

    const candidate = await updateCandidateService(
      candidateId,
      {
        ...req.body,
        ...(req.file
          ? {
              resumeFileName: req.file.originalname,
              resumeFileUrl: buildUploadedFileUrl(req.file),
            }
          : {}),
      },
      req.user?.companyId
    );

    return res.status(200).json({
      message: 'Candidato atualizado com sucesso',
      candidate,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteCandidate = async (req, res, next) => {
  try {
    const candidateId = Number(req.params.id);

    if (Number.isNaN(candidateId)) {
      return next(new AppError('ID do candidato inválido', 400));
    }

    await deleteCandidateService(
      candidateId,
      req.user?.companyId,
      req.query.companyId
    );

    return res.status(200).json({
      message: 'Candidato removido com sucesso',
    });
  } catch (error) {
    return next(error);
  }
};
