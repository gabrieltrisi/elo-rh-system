import AppError from '../errors/AppError.js';
import { createAuditLog } from '../services/auditService.js';

export const hasPermission = (user, permission) => {
  if (!user || !permission) return false;

  const currentRole = String(user.role || '').toUpperCase();
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (
    currentRole === 'SUPER_ADMIN' ||
    permissions.includes('*') ||
    permissions.includes(permission)
  ) {
    return true;
  }

  return false;
};

export const can = hasPermission;

export const authorizeRoles = (...allowedRoles) => {
  const normalizedRoles = allowedRoles.map((role) => String(role).toUpperCase());

  return (req, res, next) => {
    const currentRole = String(req.user?.role || '').toUpperCase();
    const profileSlugs = Array.isArray(req.user?.profiles)
      ? req.user.profiles.map((profile) => String(profile).toUpperCase())
      : [];

    const isAllowed =
      normalizedRoles.includes(currentRole) ||
      profileSlugs.some((profile) => normalizedRoles.includes(profile));

    if (!currentRole || !isAllowed) {
      createAuditLog({
        req,
        module: 'auth',
        entityType: 'authorization',
        entityId: req.originalUrl,
        action: 'ACCESS_DENIED',
        severity: 'CRITICAL',
        summary: 'Acesso negado por perfil insuficiente',
        details: {
          allowedRoles: normalizedRoles,
          currentRole,
          profiles: profileSlugs,
        },
      }).catch(() => null);

      return next(new AppError('Acesso negado para este perfil', 403));
    }

    return next();
  };
};

export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const allowed = requiredPermissions.every((permission) =>
      hasPermission(req.user, permission)
    );

    if (!allowed) {
      createAuditLog({
        req,
        module: 'auth',
        entityType: 'authorization',
        entityId: req.originalUrl,
        action: 'ACCESS_DENIED',
        severity: 'CRITICAL',
        summary: 'Acesso negado por permissao insuficiente',
        details: {
          requiredPermissions,
          currentPermissions: req.user?.permissions || [],
        },
      }).catch(() => null);

      return next(new AppError('Acesso negado para esta acao', 403));
    }

    return next();
  };
};

export default authorizeRoles;
