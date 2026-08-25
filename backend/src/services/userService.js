import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import {
  assignProfilesToUserService,
  ensureAuthorizationStructure,
} from './profileService.js';
import {
  clearTemporaryAccessLockService,
  ensureUserSecurityService,
  getUserSecuritySnapshotService,
  registerPasswordHistoryService,
  revokeAllUserSessionsService,
  updateUserMfaRequirementService,
  validatePasswordPolicyService,
} from './authSecurityService.js';

const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'RH', 'GESTOR', 'VISUALIZADOR'];
const USER_STATUSES = ['ATIVO', 'INATIVO', 'BLOQUEADO'];

const userInclude = {
  company: true,
  employee: {
    include: {
      employeeCompanies: {
        include: {
          company: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
  },
  userProfiles: {
    include: {
      profile: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  security: true,
  _count: {
    select: {
      sessions: {
        where: {
          revokedAt: null,
        },
      },
    },
  },
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeEmail = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    throw new AppError('E-mail é obrigatório', 400);
  }

  return normalized;
};

const normalizeRole = (value) => {
  const normalized = String(value || '').trim().toUpperCase();

  if (!USER_ROLES.includes(normalized)) {
    throw new AppError('Perfil de usuário inválido', 400);
  }

  return normalized;
};

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase();

  if (!USER_STATUSES.includes(normalized)) {
    throw new AppError('Status de usuário inválido', 400);
  }

  return normalized;
};

const normalizePassword = (value, fieldLabel = 'Senha') => {
  const normalized = String(value || '');

  if (normalized.trim().length < 6) {
    throw new AppError(`${fieldLabel} deve ter pelo menos 6 caracteres`, 400);
  }

  return normalized;
};

const getEmployeePrimaryLink = (employee) =>
  employee?.employeeCompanies?.find((link) => link.isPrimary) ||
  employee?.employeeCompanies?.[0] ||
  null;

const sanitizeUser = (user) => {
  if (!user) return null;

  const primaryEmployeeLink = getEmployeePrimaryLink(user.employee);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    companyName: user.company?.name || '',
    companyCode: user.company?.code || '',
    employeeId: user.employeeId,
    employee: user.employee
      ? {
          id: user.employee.id,
          name: user.employee.name,
          email: user.employee.email,
          role: primaryEmployeeLink?.role || user.employee.role || '',
          department:
            primaryEmployeeLink?.department || user.employee.department || '',
        }
      : null,
    profiles: (user.userProfiles || []).map((item) => ({
      id: item.profile.id,
      name: item.profile.name,
      slug: item.profile.slug,
      isPrimary: Boolean(item.isPrimary),
      isActive: Boolean(item.profile.isActive),
    })),
    primaryProfile:
      (user.userProfiles || []).find((item) => item.isPrimary)?.profile?.slug ||
      user.role,
    lastLoginAt: user.lastLoginAt,
    passwordChangedAt: user.passwordChangedAt,
    mustChangePassword: Boolean(user.mustChangePassword),
    security: {
      mfaEnabled: Boolean(user.security?.mfaEnabled),
      mfaRequired: Boolean(user.security?.mfaRequired),
      mfaMethod: user.security?.mfaMethod || 'EMAIL_OTP',
      failedLoginCount: Number(user.security?.failedLoginCount || 0),
      failedMfaCount: Number(user.security?.failedMfaCount || 0),
      lockUntil: user.security?.lockUntil || null,
      activeSessions: Number(user._count?.sessions || 0),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasLinkedEmployee: Boolean(user.employeeId),
    hasAccessed: Boolean(user.lastLoginAt),
  };
};

const validateEmployeeAccess = async (employeeId, companyId) => {
  if (!employeeId) return null;

  const employee = await prisma.employee.findUnique({
    where: {
      id: Number(employeeId),
    },
    include: {
      employeeCompanies: true,
    },
  });

  if (!employee) {
    throw new AppError('Colaborador vinculado não encontrado', 404);
  }

  const belongsToCompany =
    Number(employee.companyId) === Number(companyId) ||
    (employee.employeeCompanies || []).some(
      (link) => Number(link.companyId) === Number(companyId)
    );

  if (!belongsToCompany) {
    throw new AppError(
      'O colaborador selecionado não pertence à empresa informada',
      400
    );
  }

  return employee;
};

const ensureUniqueEmail = async (email, excludeId = null) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.id !== Number(excludeId)) {
    throw new AppError('Já existe um usuário com este e-mail', 400);
  }
};

const ensureUniqueUsername = async (username, excludeId = null) => {
  if (!username) return;

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser && existingUser.id !== Number(excludeId)) {
    throw new AppError('Já existe um usuário com este username', 400);
  }
};

const ensureTargetUser = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    include: userInclude,
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return user;
};

const buildUsersWhereClause = (filters = {}, currentUser = {}) => {
  const where = {};

  const role = normalizeOptionalString(filters.role)?.toUpperCase();
  const status = normalizeOptionalString(filters.status)?.toUpperCase();
  const employeeLink = normalizeOptionalString(filters.employeeLink)?.toLowerCase();
  const search = normalizeOptionalString(filters.search)?.toLowerCase();
  const requestedCompanyId = filters.companyId ? Number(filters.companyId) : null;

  if (requestedCompanyId) {
    where.companyId = requestedCompanyId;
  } else if (currentUser?.companyId) {
    where.companyId = Number(currentUser.companyId);
  }

  if (role && USER_ROLES.includes(role)) {
    where.role = role;
  }

  if (status && USER_STATUSES.includes(status)) {
    where.status = status;
  }

  if (employeeLink === 'linked') {
    where.employeeId = { not: null };
  }

  if (employeeLink === 'unlinked') {
    where.employeeId = null;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      {
        employee: {
          is: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  return where;
};

export const getAllUsersService = async (filters = {}, currentUser = {}) => {
  await ensureAuthorizationStructure();

  const where = buildUsersWhereClause(filters, currentUser);

  const users = await prisma.user.findMany({
    where,
    include: userInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  const sanitizedUsers = users.map(sanitizeUser);

  const roleDistribution = USER_ROLES.map((role) => ({
    role,
    count: sanitizedUsers.filter((user) => user.role === role).length,
  }));

  const summary = {
    total: sanitizedUsers.length,
    active: sanitizedUsers.filter((user) => user.status === 'ATIVO').length,
    inactive: sanitizedUsers.filter((user) => user.status === 'INATIVO').length,
    blocked: sanitizedUsers.filter((user) => user.status === 'BLOQUEADO').length,
    linkedEmployees: sanitizedUsers.filter((user) => user.hasLinkedEmployee).length,
    unlinkedEmployees: sanitizedUsers.filter((user) => !user.hasLinkedEmployee).length,
    neverLoggedIn: sanitizedUsers.filter((user) => !user.lastLoginAt).length,
    recentAccess: sanitizedUsers.filter((user) => user.lastLoginAt).length,
    roleDistribution,
  };

  return {
    users: sanitizedUsers,
    summary,
  };
};

export const getUserByIdService = async (id) => {
  await ensureAuthorizationStructure();
  const user = await ensureTargetUser(id);
  return sanitizeUser(user);
};

export const createUserService = async (data, currentUser = {}) => {
  await ensureAuthorizationStructure();

  const name = normalizeOptionalString(data.name);
  const email = normalizeEmail(data.email);
  const username = normalizeOptionalString(data.username)?.toLowerCase() || null;
  const role = normalizeRole(data.role || 'ADMIN');
  const status = normalizeStatus(data.status || 'ATIVO');
  const companyId = Number(data.companyId || currentUser.companyId);
  const employeeId = data.employeeId ? Number(data.employeeId) : null;
  const mustChangePassword = Boolean(data.mustChangePassword);
  const password = normalizePassword(data.password);

  if (!name) {
    throw new AppError('Nome é obrigatório', 400);
  }

  if (!companyId || Number.isNaN(companyId)) {
    throw new AppError('Empresa do usuário é obrigatória', 400);
  }

  await ensureUniqueEmail(email);
  await ensureUniqueUsername(username);
  await validateEmployeeAccess(employeeId, companyId);

  const validatedPassword = await validatePasswordPolicyService({
    companyId,
    password,
  });
  const passwordHash = await bcrypt.hash(validatedPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      password: passwordHash,
      role,
      status,
      employeeId,
      companyId,
      mustChangePassword,
      passwordChangedAt: new Date(),
    },
    include: userInclude,
  });

  await ensureUserSecurityService(user.id, companyId);
  await registerPasswordHistoryService(user.id, passwordHash);

  if (Array.isArray(data.profileIds) && data.profileIds.length > 0) {
    await assignProfilesToUserService(user.id, data.profileIds);

    const refreshedUser = await ensureTargetUser(user.id);
    return sanitizeUser(refreshedUser);
  }

  return sanitizeUser(user);
};

export const updateUserService = async (id, data, currentUser = {}) => {
  await ensureAuthorizationStructure();
  await ensureTargetUser(id);

  const name = normalizeOptionalString(data.name);
  const email = normalizeEmail(data.email);
  const username = normalizeOptionalString(data.username)?.toLowerCase() || null;
  const role = normalizeRole(data.role || 'ADMIN');
  const status = normalizeStatus(data.status || 'ATIVO');
  const companyId = Number(data.companyId || currentUser.companyId);
  const employeeId = data.employeeId ? Number(data.employeeId) : null;
  const mustChangePassword = Boolean(data.mustChangePassword);

  if (!name) {
    throw new AppError('Nome é obrigatório', 400);
  }

  if (!companyId || Number.isNaN(companyId)) {
    throw new AppError('Empresa do usuário é obrigatória', 400);
  }

  await ensureUniqueEmail(email, id);
  await ensureUniqueUsername(username, id);
  await validateEmployeeAccess(employeeId, companyId);

  const user = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      name,
      email,
      username,
      role,
      status,
      employeeId,
      companyId,
      mustChangePassword,
    },
    include: userInclude,
  });

  if (Array.isArray(data.profileIds) && data.profileIds.length > 0) {
    await assignProfilesToUserService(id, data.profileIds);

    const refreshedUser = await ensureTargetUser(id);
    return sanitizeUser(refreshedUser);
  }

  return sanitizeUser(user);
};

export const updateUserStatusService = async (id, status) => {
  await ensureAuthorizationStructure();
  const normalizedStatus = normalizeStatus(status);
  await ensureTargetUser(id);

  const user = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      status: normalizedStatus,
    },
    include: userInclude,
  });

  if (normalizedStatus !== 'ATIVO') {
    await revokeAllUserSessionsService({
      userId: user.id,
      reason: `USER_STATUS_${normalizedStatus}`,
    });
  }

  return sanitizeUser(user);
};

export const resetUserPasswordService = async (
  id,
  { password, mustChangePassword = true } = {}
) => {
  await ensureAuthorizationStructure();
  const targetUser = await ensureTargetUser(id);

  const normalizedPassword = normalizePassword(password, 'Nova senha');
  const validatedPassword = await validatePasswordPolicyService({
    companyId: targetUser.companyId,
    password: normalizedPassword,
    userId: targetUser.id,
  });
  const passwordHash = await bcrypt.hash(validatedPassword, 10);

  const user = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      password: passwordHash,
      mustChangePassword: Boolean(mustChangePassword),
      passwordChangedAt: new Date(),
    },
    include: userInclude,
  });

  await registerPasswordHistoryService(user.id, passwordHash);
  await revokeAllUserSessionsService({
    userId: user.id,
    reason: 'PASSWORD_RESET',
  });

  return sanitizeUser(user);
};

export const updateUserRoleService = async (id, role) => {
  await ensureAuthorizationStructure();
  const normalizedRole = normalizeRole(role);
  await ensureTargetUser(id);

  const user = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      role: normalizedRole,
    },
    include: userInclude,
  });

  return sanitizeUser(user);
};

export const linkEmployeeToUserService = async (
  id,
  employeeId,
  currentUser = {}
) => {
  await ensureAuthorizationStructure();
  const user = await ensureTargetUser(id);
  const normalizedEmployeeId = employeeId ? Number(employeeId) : null;

  await validateEmployeeAccess(
    normalizedEmployeeId,
    user.companyId || currentUser.companyId
  );

  const updatedUser = await prisma.user.update({
    where: {
      id: Number(id),
    },
    data: {
      employeeId: normalizedEmployeeId,
    },
    include: userInclude,
  });

  return sanitizeUser(updatedUser);
};

export const assignProfilesToExistingUserService = async (id, profileIds) => {
  await assignProfilesToUserService(id, profileIds);

  const refreshedUser = await ensureTargetUser(id);
  return sanitizeUser(refreshedUser);
};

export const getUserSecuritySnapshotByIdService = async (id, currentUser = {}) =>
  getUserSecuritySnapshotService({
    userId: Number(id),
    companyId: Number(currentUser.companyId),
  });

export const updateUserMfaRequirementByIdService = async (
  id,
  { mfaRequired },
  currentUser = {}
) =>
  updateUserMfaRequirementService({
    userId: Number(id),
    companyId: Number(currentUser.companyId),
    mfaRequired,
  });

export const clearUserTemporaryLockByIdService = async (
  id,
  currentUser = {}
) => {
  const user = await ensureTargetUser(id);

  await clearTemporaryAccessLockService({
    userId: user.id,
    companyId: Number(user.companyId || currentUser.companyId),
    email: user.email,
  });

  const refreshedUser = await ensureTargetUser(id);
  return sanitizeUser(refreshedUser);
};
