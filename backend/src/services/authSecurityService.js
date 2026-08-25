import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { getSecuritySettingsService } from './securitySettingsService.js';
import { sendSecurityVerificationEmail } from './emailService.js';

const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'senha123',
  'password',
  'password123',
  'admin123',
  'qwerty123',
  'elo123456',
  'rh123456',
  'empresa123',
]);

const JWT_SECRET = process.env.JWT_SECRET || 'minha_chave_secreta';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const hashCode = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

const maskEmail = (email) => {
  const normalized = normalizeEmail(email);
  const [localPart = '', domain = ''] = normalized.split('@');
  const visibleStart = localPart.slice(0, 2);
  const visibleEnd = localPart.length > 2 ? localPart.slice(-1) : '';
  return `${visibleStart}${'*'.repeat(Math.max(localPart.length - 3, 1))}${visibleEnd}@${domain}`;
};

const buildClientContext = (req = {}) => ({
  ipAddress: req.auditContext?.ipAddress || req.ip || null,
  userAgent: req.auditContext?.userAgent || req.headers?.['user-agent'] || null,
});

const getRemainingLockMinutes = (lockUntil) => {
  if (!lockUntil) return 0;

  const remainingMs = new Date(lockUntil).getTime() - Date.now();

  if (remainingMs <= 0) return 0;

  return Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
};

export const formatTemporaryLockMessage = (lockUntil) => {
  const remainingMinutes = getRemainingLockMinutes(lockUntil);

  if (!remainingMinutes) {
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  }

  return `Muitas tentativas. Tente novamente em ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`;
};

export const sanitizeSecurityUser = (user, authorizationContext = {}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username || null,
  role: authorizationContext.effectiveRole || user.role,
  status: user.status,
  companyId: user.companyId,
  companyName: user.company?.name || null,
  employeeId: user.employeeId || null,
  lastLoginAt: user.lastLoginAt || null,
  mustChangePassword: Boolean(user.mustChangePassword),
  profiles: authorizationContext.profileSlugs || [],
  permissions: authorizationContext.permissions || [],
  primaryProfile: authorizationContext.primaryProfile || null,
  security: {
    mfaEnabled: Boolean(user.security?.mfaEnabled),
    mfaRequired:
      Boolean(user.security?.mfaRequired) ||
      ['SUPER_ADMIN', 'ADMIN'].includes(
        String(authorizationContext.effectiveRole || user.role || '').toUpperCase()
      ) ||
      (authorizationContext.profileSlugs || []).includes('CEO'),
    mfaMethod: user.security?.mfaMethod || 'EMAIL_OTP',
    failedLoginCount: Number(user.security?.failedLoginCount || 0),
    failedMfaCount: Number(user.security?.failedMfaCount || 0),
    lockUntil: user.security?.lockUntil || null,
  },
});

export const signAuthToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

export const verifyAuthToken = (token) => jwt.verify(token, JWT_SECRET);

export const ensureUserSecurityService = async (userId, companyId) => {
  const existing = await prisma.userSecurity.findUnique({
    where: {
      userId: Number(userId),
    },
  });

  if (existing) return existing;

  return prisma.userSecurity.create({
    data: {
      userId: Number(userId),
      companyId: Number(companyId),
    },
  });
};

export const validatePasswordPolicyService = async ({
  companyId,
  password,
  userId = null,
}) => {
  const settings = await getSecuritySettingsService(companyId);
  const normalizedPassword = String(password || '');

  if (normalizedPassword.length < Number(settings.passwordMinLength || 12)) {
    throw new AppError(
      `A senha deve ter pelo menos ${settings.passwordMinLength || 12} caracteres`,
      400
    );
  }

  if (
    settings.blockCommonPasswords &&
    COMMON_PASSWORDS.has(normalizedPassword.trim().toLowerCase())
  ) {
    throw new AppError('Escolha uma senha menos previsivel', 400);
  }

  if (userId) {
    const [user, history] = await Promise.all([
      prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { password: true },
      }),
      prisma.passwordHistory.findMany({
        where: { userId: Number(userId) },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const hashes = [user?.password, ...history.map((item) => item.passwordHash)].filter(Boolean);

    for (const hash of hashes) {
      const matches = await bcrypt.compare(normalizedPassword, hash);
      if (matches) {
        throw new AppError('A nova senha nao pode repetir uma senha anterior', 400);
      }
    }
  }

  return normalizedPassword;
};

export const registerPasswordHistoryService = async (userId, passwordHash, tx = prisma) =>
  tx.passwordHistory.create({
    data: {
      userId: Number(userId),
      passwordHash,
    },
  });

export const getLoginAttemptStateService = async ({ email, ipAddress }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = ipAddress || 'unknown';

  const existing = await prisma.loginAttemptState.findUnique({
    where: {
      email_ipAddress: {
        email: normalizedEmail,
        ipAddress: normalizedIp,
      },
    },
  });

  if (existing) return existing;

  return prisma.loginAttemptState.create({
    data: {
      email: normalizedEmail,
      ipAddress: normalizedIp,
      failedCount: 0,
    },
  });
};

export const assertLoginAttemptAllowedService = async ({ email, ipAddress, companyId = null }) => {
  const [rawState, settings] = await Promise.all([
    getLoginAttemptStateService({ email, ipAddress }),
    getSecuritySettingsService(companyId),
  ]);

  let state = rawState;

  if (state.lockUntil && state.lockUntil <= new Date()) {
    state = await prisma.loginAttemptState.update({
      where: { id: state.id },
      data: {
        failedCount: 0,
        lockUntil: null,
      },
    });
  }

  if (state.lockUntil && state.lockUntil > new Date()) {
    throw new AppError(
      formatTemporaryLockMessage(state.lockUntil),
      429
    );
  }

  return { state, settings };
};

export const registerFailedLoginAttemptService = async ({
  email,
  ipAddress,
  user = null,
  companyId = null,
}) => {
  const { state, settings } = await assertLoginAttemptAllowedService({
    email,
    ipAddress,
    companyId,
  });

  const nextFailedCount = Number(state.failedCount || 0) + 1;
  const shouldLock = nextFailedCount >= Number(settings.maxLoginAttempts || 5);
  const lockUntil = shouldLock
    ? new Date(Date.now() + Number(settings.loginLockMinutes || 15) * 60 * 1000)
    : null;

  await prisma.loginAttemptState.update({
    where: { id: state.id },
    data: {
      failedCount: nextFailedCount,
      lastAttemptAt: new Date(),
      lockUntil,
    },
  });

  if (user) {
    const security = await ensureUserSecurityService(user.id, user.companyId);
    await prisma.userSecurity.update({
      where: { id: security.id },
      data: {
        failedLoginCount: nextFailedCount,
        lastFailedLoginAt: new Date(),
        lockUntil,
      },
    });
  }

  return {
    failedCount: nextFailedCount,
    lockUntil,
    shouldLock,
  };
};

export const registerSuccessfulLoginAttemptService = async ({
  email,
  ipAddress,
  user,
}) => {
  const normalizedIp = ipAddress || 'unknown';
  const normalizedEmail = normalizeEmail(email);

  const state = await prisma.loginAttemptState.findUnique({
    where: {
      email_ipAddress: {
        email: normalizedEmail,
        ipAddress: normalizedIp,
      },
    },
  });

  if (state) {
    await prisma.loginAttemptState.update({
      where: { id: state.id },
      data: {
        failedCount: 0,
        lockUntil: null,
        lastAttemptAt: new Date(),
      },
    });
  }

  const security = await ensureUserSecurityService(user.id, user.companyId);
  await prisma.userSecurity.update({
    where: { id: security.id },
    data: {
      failedLoginCount: 0,
      lockUntil: null,
      lastSuccessfulLoginAt: new Date(),
    },
  });
};

export const isMfaRequiredForUserService = ({
  user,
  authorizationContext = {},
  settings = {},
}) => {
  const role = String(authorizationContext.effectiveRole || user.role || '').toUpperCase();
  const profileSlugs = authorizationContext.profileSlugs || [];

  if (!settings.enableMfaReady && !user.security?.mfaEnabled && !user.security?.mfaRequired) {
    return false;
  }

  if (Boolean(user.security?.mfaEnabled)) return true;
  if (Boolean(user.security?.mfaRequired)) return true;
  if (settings.mfaRequiredForPrivileged && ['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return true;
  }
  if (profileSlugs.includes('CEO')) {
    return true;
  }
  if (settings.mfaOptionalForRh && role === 'RH') {
    return Boolean(user.security?.mfaEnabled || user.security?.mfaRequired);
  }

  return false;
};

export const createAuthChallengeService = async ({
  user,
  purpose,
  metadata = null,
  expiresInMinutes = 10,
  maxAttempts = 5,
}) => {
  const rawCode = String(Math.floor(100000 + Math.random() * 900000));
  const challengeToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + Number(expiresInMinutes || 10) * 60 * 1000);

  await prisma.authChallenge.updateMany({
    where: {
      userId: Number(user.id),
      purpose,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      consumedAt: new Date(),
      metadataJson: {
        reason: 'SUPERSEDED',
      },
    },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: Number(user.id),
      companyId: Number(user.companyId),
      challengeToken,
      purpose,
      codeHash: hashCode(rawCode),
      expiresAt,
      maxAttempts: Number(maxAttempts || 5),
      metadataJson: metadata,
    },
  });

  await sendSecurityVerificationEmail({
    to: user.email,
    name: user.name,
    code: rawCode,
    purpose,
    expiresInMinutes,
  });

  return {
    id: challenge.id,
    challengeToken,
    expiresAt,
    maskedEmail: maskEmail(user.email),
    purpose,
  };
};

export const consumeAuthChallengeService = async ({
  challengeToken,
  code,
  expectedPurpose = null,
}) => {
  const challenge = await prisma.authChallenge.findUnique({
    where: { challengeToken: String(challengeToken) },
    include: {
      user: {
        include: {
          company: true,
          security: true,
        },
      },
    },
  });

  if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
    throw new AppError('Codigo de verificacao invalido ou expirado', 400);
  }

  if (expectedPurpose && challenge.purpose !== expectedPurpose) {
    throw new AppError('Desafio de autenticacao invalido para esta operacao', 400);
  }

  if (Number(challenge.attempts || 0) >= Number(challenge.maxAttempts || 5)) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        consumedAt: new Date(),
      },
    });

    throw new AppError('Codigo de verificacao invalido ou expirado', 400);
  }

  const isValid = hashCode(code) === challenge.codeHash;

  if (!isValid) {
    const nextAttempts = Number(challenge.attempts || 0) + 1;
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: nextAttempts,
        consumedAt:
          nextAttempts >= Number(challenge.maxAttempts || 5) ? new Date() : null,
      },
    });

    const security = await ensureUserSecurityService(
      challenge.user.id,
      challenge.user.companyId
    );

    await prisma.userSecurity.update({
      where: { id: security.id },
      data: {
        failedMfaCount: {
          increment: 1,
        },
      },
    });

    throw new AppError('Codigo de verificacao invalido ou expirado', 400);
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: {
      consumedAt: new Date(),
    },
  });

  const security = await ensureUserSecurityService(
    challenge.user.id,
    challenge.user.companyId
  );
  await prisma.userSecurity.update({
    where: { id: security.id },
    data: {
      mfaEnabled:
        challenge.purpose === 'MFA_SETUP' ? true : challenge.user.security?.mfaEnabled,
      failedMfaCount: 0,
      lastMfaAt: new Date(),
      reauthAt:
        challenge.purpose === 'REAUTH' ? new Date() : challenge.user.security?.reauthAt,
    },
  });

  return challenge;
};

export const createPasswordResetChallengeService = async ({
  user,
  req = null,
}) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.authChallenge.updateMany({
    where: {
      userId: Number(user.id),
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      consumedAt: new Date(),
      metadataJson: {
        reason: 'SUPERSEDED',
      },
    },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: Number(user.id),
      companyId: Number(user.companyId),
      challengeToken: resetToken,
      purpose: 'PASSWORD_RESET',
      codeHash: hashCode(resetToken),
      expiresAt,
      maxAttempts: 1,
      metadataJson: {
        issuedFromIp: req?.auditContext?.ipAddress || req?.ip || null,
      },
    },
  });

  return {
    id: challenge.id,
    token: resetToken,
    expiresAt,
  };
};

export const consumePasswordResetChallengeService = async ({
  token,
}) => {
  const challenge = await prisma.authChallenge.findUnique({
    where: {
      challengeToken: String(token),
    },
    include: {
      user: true,
    },
  });

  if (
    !challenge ||
    challenge.purpose !== 'PASSWORD_RESET' ||
    challenge.consumedAt ||
    challenge.expiresAt < new Date() ||
    hashCode(token) !== challenge.codeHash
  ) {
    throw new AppError('O link de redefinicao e invalido ou expirou', 400);
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: {
      consumedAt: new Date(),
      attempts: {
        increment: 1,
      },
    },
  });

  return challenge;
};

export const createUserSessionService = async ({
  user,
  effectiveRole = null,
  mfaVerified = false,
  reauthAt = null,
  req = null,
}) => {
  const settings = await getSecuritySettingsService(user.companyId);
  const tokenId = crypto.randomUUID();
  const now = new Date();
  const context = buildClientContext(req);
  const expiresAt = new Date(now.getTime() + Number(settings.sessionTimeoutMinutes || 120) * 60 * 1000);
  const absoluteExpiresAt = new Date(
    now.getTime() + Number(settings.absoluteSessionHours || 24) * 60 * 60 * 1000
  );

  const session = await prisma.userSession.create({
    data: {
      userId: Number(user.id),
      companyId: Number(user.companyId),
      tokenId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt,
      absoluteExpiresAt,
      mfaVerifiedAt: mfaVerified ? now : null,
      reauthAt: reauthAt || null,
    },
  });

  return {
    session,
    token: signAuthToken({
      userId: user.id,
      email: user.email,
      role: effectiveRole || user.role,
      companyId: user.companyId,
      sessionId: session.id,
      tokenId,
      mfaVerified: Boolean(mfaVerified),
    }),
  };
};

export const touchUserSessionService = async (sessionId) => {
  const session = await prisma.userSession.findUnique({
    where: { id: Number(sessionId) },
  });

  if (!session || session.revokedAt) {
    throw new AppError('Sessao invalida ou revogada', 401);
  }

  const now = new Date();

  if (session.expiresAt < now || session.absoluteExpiresAt < now) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        revokedAt: now,
        revokedReason: 'SESSION_EXPIRED',
      },
    });
    throw new AppError('Sessao expirada', 401);
  }

  const settings = await getSecuritySettingsService(session.companyId);

  return prisma.userSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: now,
      expiresAt: new Date(
        now.getTime() + Number(settings.sessionTimeoutMinutes || 120) * 60 * 1000
      ),
    },
  });
};

export const revokeSessionService = async ({
  sessionId,
  reason = 'USER_REQUEST',
}) =>
  prisma.userSession.update({
    where: { id: Number(sessionId) },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

export const revokeAllUserSessionsService = async ({
  userId,
  exceptSessionId = null,
  reason = 'USER_REQUEST',
}) =>
  prisma.userSession.updateMany({
    where: {
      userId: Number(userId),
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: Number(exceptSessionId) } } : {}),
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

export const listUserSessionsService = async ({
  userId,
  companyId,
}) => {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId: Number(userId),
      companyId: Number(companyId),
    },
    orderBy: [{ revokedAt: 'asc' }, { lastActivityAt: 'desc' }],
  });

  return sessions.map((session) => ({
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    expiresAt: session.expiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    revokedAt: session.revokedAt,
    revokedReason: session.revokedReason,
    mfaVerifiedAt: session.mfaVerifiedAt,
    reauthAt: session.reauthAt,
    isActive:
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.absoluteExpiresAt > new Date(),
  }));
};

export const getUserSecuritySnapshotService = async ({ userId, companyId }) => {
  const [user, security, sessions, recentChallenges] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: Number(userId),
        companyId: Number(companyId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
      },
    }),
    prisma.userSecurity.findUnique({
      where: { userId: Number(userId) },
    }),
    listUserSessionsService({ userId, companyId }),
    prisma.authChallenge.findMany({
      where: {
        userId: Number(userId),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!user) {
    throw new AppError('Usuario nao encontrado', 404);
  }

  return {
    user,
    security: {
      mfaEnabled: Boolean(security?.mfaEnabled),
      mfaRequired: Boolean(security?.mfaRequired),
      mfaMethod: security?.mfaMethod || 'EMAIL_OTP',
      failedLoginCount: Number(security?.failedLoginCount || 0),
      failedMfaCount: Number(security?.failedMfaCount || 0),
      lockUntil: security?.lockUntil || null,
      lastFailedLoginAt: security?.lastFailedLoginAt || null,
      lastSuccessfulLoginAt: security?.lastSuccessfulLoginAt || null,
      lastMfaAt: security?.lastMfaAt || null,
      reauthAt: security?.reauthAt || null,
    },
    sessions,
    challenges: recentChallenges.map((challenge) => ({
      id: challenge.id,
      purpose: challenge.purpose,
      createdAt: challenge.createdAt,
      consumedAt: challenge.consumedAt,
      expiresAt: challenge.expiresAt,
      attempts: challenge.attempts,
    })),
  };
};

export const updateUserMfaRequirementService = async ({
  userId,
  companyId,
  mfaRequired,
}) => {
  const security = await ensureUserSecurityService(userId, companyId);
  return prisma.userSecurity.update({
    where: { id: security.id },
    data: {
      mfaRequired: Boolean(mfaRequired),
    },
  });
};

export const clearTemporaryAccessLockService = async ({
  userId = null,
  companyId = null,
  email = null,
}) => {
  const normalizedEmail = email ? normalizeEmail(email) : null;

  const operations = [];

  if (normalizedEmail) {
    operations.push(
      prisma.loginAttemptState.updateMany({
        where: {
          email: normalizedEmail,
        },
        data: {
          failedCount: 0,
          lockUntil: null,
          lastAttemptAt: null,
        },
      })
    );
  }

  if (userId && companyId) {
    operations.push(
      prisma.userSecurity.updateMany({
        where: {
          userId: Number(userId),
          companyId: Number(companyId),
        },
        data: {
          failedLoginCount: 0,
          failedMfaCount: 0,
          lockUntil: null,
          lastFailedLoginAt: null,
        },
      })
    );
  }

  await Promise.all(operations);

  return {
    email: normalizedEmail,
    userId: userId ? Number(userId) : null,
    companyId: companyId ? Number(companyId) : null,
    cleared: true,
  };
};

export const markUserReauthenticatedService = async ({ userId, companyId, sessionId }) => {
  const now = new Date();
  await ensureUserSecurityService(userId, companyId);
  await prisma.userSecurity.update({
    where: { userId: Number(userId) },
    data: {
      reauthAt: now,
    },
  });

  if (sessionId) {
    await prisma.userSession.update({
      where: { id: Number(sessionId) },
      data: {
        reauthAt: now,
      },
    });
  }

  return now;
};

export const assertRecentReauthService = async ({ userId, companyId, sessionId }) => {
  const settings = await getSecuritySettingsService(companyId);
  const session = await prisma.userSession.findFirst({
    where: {
      id: Number(sessionId),
      userId: Number(userId),
      companyId: Number(companyId),
    },
  });

  if (!session) {
    throw new AppError('Sessao nao encontrada para reautenticacao', 401);
  }

  const reauthAt = session.reauthAt;
  if (
    !reauthAt ||
    reauthAt.getTime() <
      Date.now() - Number(settings.reauthWindowMinutes || 20) * 60 * 1000
  ) {
    throw new AppError('Reautenticacao recente obrigatoria para esta acao', 428);
  }

  return true;
};
