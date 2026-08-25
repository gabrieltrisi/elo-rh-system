import AppError from '../errors/AppError.js';
import {
  assignPermissionsToProfileService,
  createProfileService,
  duplicateProfileService,
  getAllPermissionsService,
  getAllProfilesService,
  getProfileByIdService,
  updateProfileService,
  updateProfileStatusService,
} from '../services/profileService.js';
import { createAuditLog } from '../services/auditService.js';

export const getAllProfiles = async (req, res, next) => {
  try {
    const result = await getAllProfilesService(req.query);

    return res.json({
      message: 'Perfis encontrados com sucesso',
      profiles: result.profiles,
      summary: result.summary,
    });
  } catch (error) {
    return next(error);
  }
};

export const getProfileById = async (req, res, next) => {
  try {
    const profile = await getProfileByIdService(req.params.id);

    return res.json({
      message: 'Perfil encontrado com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const createProfile = async (req, res, next) => {
  try {
    const profile = await createProfileService(req.body);

    await createAuditLog({
      req,
      module: 'roles_permissions',
      entityType: 'profile',
      entityId: profile.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: `Perfil "${profile.name}" criado`,
      after: profile,
    });

    return res.status(201).json({
      message: 'Perfil criado com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await updateProfileService(req.params.id, req.body);

    await createAuditLog({
      req,
      module: 'roles_permissions',
      entityType: 'profile',
      entityId: profile.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: `Perfil "${profile.name}" atualizado`,
      after: profile,
    });

    return res.json({
      message: 'Perfil atualizado com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const duplicateProfile = async (req, res, next) => {
  try {
    const profile = await duplicateProfileService(req.params.id);

    await createAuditLog({
      req,
      module: 'roles_permissions',
      entityType: 'profile',
      entityId: profile.id,
      action: 'CREATE',
      severity: 'WARNING',
      summary: `Perfil "${profile.name}" duplicado a partir de um perfil existente`,
      after: profile,
    });

    return res.status(201).json({
      message: 'Perfil duplicado com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfileStatus = async (req, res, next) => {
  try {
    if (typeof req.body?.isActive !== 'boolean') {
      throw new AppError('isActive é obrigatório', 400);
    }

    const profile = await updateProfileStatusService(
      req.params.id,
      req.body.isActive
    );

    await createAuditLog({
      req,
      module: 'roles_permissions',
      entityType: 'profile',
      entityId: profile.id,
      action: 'UPDATE',
      severity: 'WARNING',
      summary: `Status do perfil "${profile.name}" alterado`,
      after: {
        isActive: profile.isActive,
      },
    });

    return res.json({
      message: 'Status do perfil atualizado com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const assignPermissionsToProfile = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.permissions)) {
      throw new AppError('permissions deve ser uma lista', 400);
    }

    const profile = await assignPermissionsToProfileService(
      req.params.id,
      req.body.permissions
    );

    await createAuditLog({
      req,
      module: 'roles_permissions',
      entityType: 'profile',
      entityId: profile.id,
      action: 'ASSIGN_ROLE',
      severity: 'CRITICAL',
      summary: `Permissoes do perfil "${profile.name}" atualizadas`,
      after: {
        permissions: profile.permissions,
      },
    });

    return res.json({
      message: 'Permissões do perfil atualizadas com sucesso',
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllPermissions = async (req, res, next) => {
  try {
    const result = await getAllPermissionsService();

    return res.json({
      message: 'Permissões encontradas com sucesso',
      permissions: result.permissions,
      grouped: result.grouped,
      total: result.total,
    });
  } catch (error) {
    return next(error);
  }
};
