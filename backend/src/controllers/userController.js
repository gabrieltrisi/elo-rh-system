import AppError from '../errors/AppError.js';
import {
  assignProfilesToExistingUserService,
  createUserService,
  clearUserTemporaryLockByIdService,
  getAllUsersService,
  getUserByIdService,
  getUserSecuritySnapshotByIdService,
  linkEmployeeToUserService,
  resetUserPasswordService,
  updateUserRoleService,
  updateUserMfaRequirementByIdService,
  updateUserService,
  updateUserStatusService,
} from '../services/userService.js';
import { createAuditLog } from '../services/auditService.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const result = await getAllUsersService(req.query, req.user);

    return res.json({
      message: 'Usuários encontrados com sucesso',
      users: result.users,
      summary: result.summary,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await getUserByIdService(req.params.id);

    return res.json({
      message: 'Usuário encontrado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await createUserService(req.body, req.user);

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'CREATE',
      severity: 'INFO',
      summary: `Usuario "${user.name || user.email}" criado`,
      after: user,
    });

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await updateUserService(req.params.id, req.body, req.user);

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'UPDATE',
      severity: 'INFO',
      summary: `Usuario "${user.name || user.email}" atualizado`,
      after: user,
    });

    return res.json({
      message: 'Usuário atualizado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    if (!req.body?.status) {
      throw new AppError('Status é obrigatório', 400);
    }

    const user = await updateUserStatusService(req.params.id, req.body.status);

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'UPDATE',
      severity: user.status === 'BLOQUEADO' ? 'CRITICAL' : 'WARNING',
      summary: `Status do usuario "${user.name || user.email}" alterado para ${user.status}`,
      after: user,
      details: {
        status: user.status,
      },
    });

    return res.json({
      message: 'Status do usuário atualizado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    if (!req.body?.password) {
      throw new AppError('Nova senha é obrigatória', 400);
    }

    const user = await resetUserPasswordService(req.params.id, req.body);

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'RESET_PASSWORD',
      severity: 'CRITICAL',
      summary: `Senha do usuario "${user.name || user.email}" redefinida administrativamente`,
      after: {
        mustChangePassword: user.mustChangePassword,
      },
    });

    return res.json({
      message: 'Senha redefinida com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    if (!req.body?.role) {
      throw new AppError('Perfil é obrigatório', 400);
    }

    const user = await updateUserRoleService(req.params.id, req.body.role);

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'ASSIGN_ROLE',
      severity: 'WARNING',
      summary: `Perfil principal do usuario "${user.name || user.email}" alterado para ${user.role}`,
      after: user,
    });

    return res.json({
      message: 'Perfil do usuário atualizado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const linkEmployeeToUser = async (req, res, next) => {
  try {
    const user = await linkEmployeeToUserService(
      req.params.id,
      req.body?.employeeId,
      req.user
    );

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'UPDATE',
      severity: 'INFO',
      summary: `Vinculo RH do usuario "${user.name || user.email}" atualizado`,
      after: user,
      details: {
        employeeId: user.employeeId,
      },
    });

    return res.json({
      message: 'Vínculo com colaborador atualizado com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const assignProfilesToUser = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.profileIds) || req.body.profileIds.length === 0) {
      throw new AppError('Selecione ao menos um perfil', 400);
    }

    const user = await assignProfilesToExistingUserService(
      req.params.id,
      req.body.profileIds
    );

    await createAuditLog({
      req,
      module: 'users',
      entityType: 'user',
      entityId: user.id,
      action: 'ASSIGN_ROLE',
      severity: 'WARNING',
      summary: `Perfis do usuario "${user.name || user.email}" atualizados`,
      after: {
        profiles: user.profiles,
      },
    });

    return res.json({
      message: 'Perfis do usuário atualizados com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserSecuritySnapshot = async (req, res, next) => {
  try {
    const snapshot = await getUserSecuritySnapshotByIdService(
      req.params.id,
      req.user
    );

    return res.json({
      message: 'Seguranca do usuario carregada com sucesso',
      snapshot,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserMfaRequirement = async (req, res, next) => {
  try {
    const security = await updateUserMfaRequirementByIdService(
      req.params.id,
      req.body,
      req.user
    );

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'user_security',
      entityId: String(req.params.id),
      action: 'UPDATE',
      severity: 'WARNING',
      summary: 'Obrigatoriedade de MFA do usuario atualizada',
      after: {
        mfaRequired: Boolean(security.mfaRequired),
      },
    });

    return res.json({
      message: 'Politica de MFA do usuario atualizada com sucesso',
      security,
    });
  } catch (error) {
    return next(error);
  }
};

export const clearUserTemporaryLock = async (req, res, next) => {
  try {
    const user = await clearUserTemporaryLockByIdService(
      req.params.id,
      req.user
    );

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'user_security',
      entityId: String(req.params.id),
      action: 'UNLOCK',
      severity: 'WARNING',
      summary: 'Bloqueio temporario de autenticacao removido manualmente',
      after: {
        failedLoginCount: Number(user.security?.failedLoginCount || 0),
        failedMfaCount: Number(user.security?.failedMfaCount || 0),
        lockUntil: user.security?.lockUntil || null,
      },
    });

    return res.json({
      message: 'Bloqueio temporario removido com sucesso',
      user,
    });
  } catch (error) {
    return next(error);
  }
};
