import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';
import {
  isEmailTransportReady,
  sendPasswordResetEmail,
} from '../services/emailService.js';
import {
  ensureAuthorizationStructure,
  resolveUserPermissionContext,
} from '../services/profileService.js';
import { createAuditLog } from '../services/auditService.js';
import {
  assertLoginAttemptAllowedService,
  createPasswordResetChallengeService,
  consumeAuthChallengeService,
  consumePasswordResetChallengeService,
  createAuthChallengeService,
  createUserSessionService,
  ensureUserSecurityService,
  formatTemporaryLockMessage,
  isMfaRequiredForUserService,
  listUserSessionsService,
  markUserReauthenticatedService,
  registerFailedLoginAttemptService,
  registerPasswordHistoryService,
  registerSuccessfulLoginAttemptService,
  revokeAllUserSessionsService,
  revokeSessionService,
  sanitizeSecurityUser,
  validatePasswordPolicyService,
} from '../services/authSecurityService.js';
import { getSecuritySettingsService } from '../services/securitySettingsService.js';

const INVALID_LOGIN_MESSAGE = 'Credenciais invalidas ou acesso indisponivel';
const PUBLIC_REGISTER_DISABLED_MESSAGE =
  'Cadastro publico de usuarios esta desabilitado. Use o fluxo administrativo.';

const isPublicRegisterAllowed = () =>
  process.env.NODE_ENV === 'development' &&
  String(process.env.ALLOW_PUBLIC_REGISTER || '').trim().toLowerCase() ===
    'true';

const getUserByEmail = async (email) =>
  prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
      security: true,
    },
  });

const completeAuthentication = async ({
  req,
  res,
  user,
  authorizationContext,
  mfaVerified = false,
  reauthAt = null,
}) => {
  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
    include: {
      company: true,
      security: true,
    },
  });

  const { session, token } = await createUserSessionService({
    user: updatedUser,
    effectiveRole: authorizationContext.effectiveRole || updatedUser.role,
    mfaVerified,
    reauthAt,
    req,
  });

  await createAuditLog({
    req,
    user: {
      userId: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      companyId: updatedUser.companyId,
    },
    companyId: updatedUser.companyId,
    module: 'security',
    entityType: 'session',
    entityId: session.id,
    action: 'LOGIN',
    severity: 'INFO',
    summary: `Login realizado por ${updatedUser.email}`,
    details: {
      mfaVerified,
      sessionId: session.id,
      tokenId: session.tokenId,
    },
  });

  return res.status(200).json({
    message: 'Login realizado com sucesso',
    token,
    session: {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      mfaVerifiedAt: session.mfaVerifiedAt,
    },
    user: sanitizeSecurityUser(updatedUser, authorizationContext),
  });
};

const createMfaRequiredResponse = ({
  message = 'Verificacao adicional obrigatoria',
  challenge,
  user,
  authorizationContext,
  setup = false,
}) => ({
  message,
  state: setup ? 'MFA_SETUP_REQUIRED' : 'MFA_REQUIRED',
  challengeToken: challenge.challengeToken,
  expiresAt: challenge.expiresAt,
  maskedEmail: challenge.maskedEmail,
  purpose: challenge.purpose,
  user: sanitizeSecurityUser(user, authorizationContext),
});

export const bootstrapAdmin = async (req, res) => {
  const { companyName, cnpj, name, email, password } = req.body;

  try {
    await ensureAuthorizationStructure();

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        message: 'companyName, name, email e password sao obrigatorios',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      return res.status(400).json({
        message: 'Ja existe um usuario com este e-mail',
      });
    }

    const existingCompany = await prisma.company.findFirst();
    const existingUser = await prisma.user.findFirst();

    if (existingCompany || existingUser) {
      return res.status(400).json({
        message: 'Sistema ja foi inicializado. Bootstrap nao permitido.',
      });
    }

    const validatedPassword = await validatePasswordPolicyService({
      companyId: 1,
      password,
    }).catch(() => String(password));
    const hashedPassword = await bcrypt.hash(validatedPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          cnpj: cnpj || null,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'ADMIN',
          status: 'ATIVO',
          companyId: company.id,
          passwordChangedAt: new Date(),
        },
        include: {
          company: true,
          security: true,
        },
      });

      await tx.userSecurity.create({
        data: {
          userId: user.id,
          companyId: company.id,
          mfaRequired: true,
        },
      });

      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: hashedPassword,
        },
      });

      return { company, user };
    });

    const authorizationContext = await resolveUserPermissionContext(
      result.user.id,
      result.user.role
    );

    return completeAuthentication({
      req,
      res,
      user: result.user,
      authorizationContext,
      mfaVerified: false,
    });
  } catch (error) {
    console.error('BOOTSTRAP ERROR:', error);
    return res.status(500).json({
      message: 'Erro no servidor',
      error: error.message,
    });
  }
};

export const register = async (req, res) => {
  const {
    name,
    email,
    password,
    companyId,
    role,
    username,
    employeeId,
    status,
    mustChangePassword,
  } = req.body;

  try {
    if (!isPublicRegisterAllowed()) {
      await createAuditLog({
        req,
        module: 'security',
        entityType: 'auth',
        entityId: 'register',
        action: 'REGISTER_BLOCKED',
        severity: 'CRITICAL',
        summary: 'Tentativa de uso da rota publica de cadastro bloqueada',
      });

      return res.status(403).json({
        message: PUBLIC_REGISTER_DISABLED_MESSAGE,
        code: 'PUBLIC_REGISTER_DISABLED',
      });
    }

    await ensureAuthorizationStructure();

    if (!name || !email || !password || !companyId) {
      return res.status(400).json({
        message: 'name, email, password e companyId sao obrigatorios',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = username
      ? String(username).trim().toLowerCase()
      : null;

    const userExists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      return res.status(400).json({ message: 'Usuario ja existe' });
    }

    if (normalizedUsername) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });

      if (usernameExists) {
        return res.status(400).json({ message: 'Username ja existe' });
      }
    }

    const companyExists = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!companyExists) {
      return res.status(404).json({ message: 'Empresa nao encontrada' });
    }

    const validatedPassword = await validatePasswordPolicyService({
      companyId: Number(companyId),
      password,
    });
    const hashedPassword = await bcrypt.hash(validatedPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword,
        role: role || 'ADMIN',
        status: status || 'ATIVO',
        companyId: Number(companyId),
        employeeId: employeeId ? Number(employeeId) : null,
        mustChangePassword: Boolean(mustChangePassword),
        passwordChangedAt: new Date(),
      },
      include: {
        company: true,
        security: true,
      },
    });

    await ensureUserSecurityService(newUser.id, newUser.companyId);
    await registerPasswordHistoryService(newUser.id, hashedPassword);

    const authorizationContext = await resolveUserPermissionContext(
      newUser.id,
      newUser.role
    );

    return res.status(201).json({
      message: 'Usuario cadastrado com sucesso',
      user: sanitizeSecurityUser(newUser, authorizationContext),
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro no servidor',
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.auditContext?.ipAddress || req.ip || null;

  try {
    await ensureAuthorizationStructure();

    if (!email || !password) {
      return res.status(400).json({
        message: 'E-mail e senha sao obrigatorios',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    await assertLoginAttemptAllowedService({
      email: normalizedEmail,
      ipAddress,
      companyId: null,
    });

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      await registerFailedLoginAttemptService({
        email: normalizedEmail,
        ipAddress,
      });

      await createAuditLog({
        req,
        module: 'security',
        entityType: 'auth',
        entityId: normalizedEmail,
        action: 'LOGIN_FAILED',
        severity: 'WARNING',
        summary: 'Tentativa de login invalida',
        details: {
          reason: 'USER_NOT_FOUND',
        },
      });

      return res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    }

    if (
      user.security?.lockUntil &&
      new Date(user.security.lockUntil).getTime() > Date.now()
    ) {
      await createAuditLog({
        req,
        companyId: user.companyId,
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
        },
        module: 'security',
        entityType: 'auth',
        entityId: user.id,
        action: 'LOCKED_LOGIN_ATTEMPT',
        severity: 'CRITICAL',
        summary: 'Tentativa de login enquanto o usuario estava bloqueado temporariamente',
      });

      return res.status(429).json({
        message: formatTemporaryLockMessage(user.security.lockUntil),
        code: 'LOGIN_TEMP_LOCK',
        lockUntil: user.security.lockUntil,
      });
    }

    if (user.status !== 'ATIVO') {
      await createAuditLog({
        req,
        companyId: user.companyId,
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
        },
        module: 'security',
        entityType: 'auth',
        entityId: user.id,
        action: 'LOGIN_DENIED',
        severity: 'CRITICAL',
        summary: 'Tentativa de login em usuario inativo ou bloqueado',
        details: {
          status: user.status,
        },
      });

      return res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const failedState = await registerFailedLoginAttemptService({
        email: normalizedEmail,
        ipAddress,
        user,
        companyId: user.companyId,
      });

      await createAuditLog({
        req,
        companyId: user.companyId,
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
        },
        module: 'security',
        entityType: 'auth',
        entityId: user.id,
        action: failedState.shouldLock ? 'TEMP_LOCK' : 'LOGIN_FAILED',
        severity: failedState.shouldLock ? 'CRITICAL' : 'WARNING',
        summary: failedState.shouldLock
          ? 'Bloqueio temporario aplicado por excesso de falhas no login'
          : 'Tentativa de login com senha invalida',
        details: {
          failedCount: failedState.failedCount,
          lockUntil: failedState.lockUntil,
        },
      });

      return res.status(failedState.shouldLock ? 429 : 401).json({
        message: failedState.shouldLock
          ? formatTemporaryLockMessage(failedState.lockUntil)
          : INVALID_LOGIN_MESSAGE,
        ...(failedState.shouldLock
          ? {
              code: 'LOGIN_TEMP_LOCK',
              lockUntil: failedState.lockUntil,
            }
          : {}),
      });
    }

    const authorizationContext = await resolveUserPermissionContext(
      user.id,
      user.role
    );
    const settings = await getSecuritySettingsService(user.companyId);

    await registerSuccessfulLoginAttemptService({
      email: normalizedEmail,
      ipAddress,
      user,
    });

    const mfaRequired = isMfaRequiredForUserService({
      user,
      authorizationContext,
      settings,
    });

    if (mfaRequired) {
      if (!isEmailTransportReady()) {
        return res.status(503).json({
          message:
            'O provedor de e-mail ainda nao esta configurado para verificacao em duas etapas.',
        });
      }

      const challenge = await createAuthChallengeService({
        user,
        purpose: user.security?.mfaEnabled ? 'LOGIN_MFA' : 'MFA_SETUP',
        metadata: {
          authorizationContext,
        },
      });

      await createAuditLog({
        req,
        companyId: user.companyId,
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
        },
        module: 'security',
        entityType: 'auth_challenge',
        entityId: challenge.id,
        action: 'MFA_REQUIRED',
        severity: 'INFO',
        summary: 'Verificacao adicional solicitada para concluir o login',
        details: {
          purpose: challenge.purpose,
          expiresAt: challenge.expiresAt,
        },
      });

      return res.status(200).json(
        createMfaRequiredResponse({
          challenge,
          user,
          authorizationContext,
          setup: challenge.purpose === 'MFA_SETUP',
        })
      );
    }

    return completeAuthentication({
      req,
      res,
      user,
      authorizationContext,
      mfaVerified: false,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(error?.statusCode || 500).json({
      message:
        error?.statusCode && error.statusCode < 500
          ? error.message
          : 'Erro no servidor',
    });
  }
};

export const verifyMfa = async (req, res) => {
  const { challengeToken, code } = req.body;

  try {
    if (!challengeToken || !code) {
      return res.status(400).json({
        message: 'challengeToken e codigo sao obrigatorios',
      });
    }

    const challenge = await consumeAuthChallengeService({
      challengeToken,
      code,
    });

    const authorizationContext = await resolveUserPermissionContext(
      challenge.user.id,
      challenge.user.role
    );

    await createAuditLog({
      req,
      companyId: challenge.user.companyId,
      user: {
        userId: challenge.user.id,
        name: challenge.user.name,
        email: challenge.user.email,
        companyId: challenge.user.companyId,
      },
      module: 'security',
      entityType: 'auth_challenge',
      entityId: challenge.id,
      action: 'MFA_VERIFIED',
      severity: 'INFO',
      summary: 'Codigo de verificacao validado com sucesso',
      details: {
        purpose: challenge.purpose,
      },
    });

    if (challenge.purpose === 'REAUTH') {
      const reauthAt = await markUserReauthenticatedService({
        userId: challenge.user.id,
        companyId: challenge.user.companyId,
      });

      return res.status(200).json({
        message: 'Reautenticacao validada com sucesso',
        reauthAt,
      });
    }

    return completeAuthentication({
      req,
      res,
      user: challenge.user,
      authorizationContext,
      mfaVerified: true,
      reauthAt: new Date(),
    });
  } catch (error) {
    console.error('MFA VERIFY ERROR:', error);

    if (challengeToken) {
      const auditChallenge = await prisma.authChallenge.findUnique({
        where: { challengeToken: String(challengeToken) },
      });

      if (auditChallenge) {
        await createAuditLog({
          req,
          module: 'security',
          companyId: auditChallenge.companyId,
          entityType: 'auth_challenge',
          entityId: auditChallenge.id,
          action: 'MFA_FAILED',
          severity: 'WARNING',
          summary: 'Falha na validacao do codigo MFA',
          details: {
            purpose: auditChallenge.purpose,
            attempts: Number(auditChallenge.attempts || 0),
          },
        }).catch(() => null);
      }
    }

    return res.status(error?.statusCode || 500).json({
      message:
        error?.statusCode && error.statusCode < 500
          ? error.message
          : 'Erro ao validar MFA',
    });
  }
};

export const setupMfa = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user.userId) },
      include: {
        company: true,
        security: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario nao encontrado',
      });
    }

    if (!isEmailTransportReady()) {
      return res.status(503).json({
        message: 'Configuracao de e-mail indisponivel para ativar MFA',
      });
    }

    const authorizationContext = await resolveUserPermissionContext(
      user.id,
      user.role
    );
    const challenge = await createAuthChallengeService({
      user,
      purpose: 'MFA_SETUP',
      metadata: {
        requestedBy: req.user.userId,
      },
    });

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'auth_challenge',
      entityId: challenge.id,
      action: 'MFA_SETUP_STARTED',
      severity: 'WARNING',
      summary: 'Fluxo de ativacao de MFA iniciado',
    });

    return res.status(200).json(
      createMfaRequiredResponse({
        challenge,
        user,
        authorizationContext,
        setup: true,
        message: 'Codigo enviado para ativacao do MFA',
      })
    );
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao iniciar configuracao de MFA',
    });
  }
};

export const disableMfa = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user.userId) },
      include: {
        security: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario nao encontrado',
      });
    }

    const authorizationContext = await resolveUserPermissionContext(
      user.id,
      user.role
    );
    const settings = await getSecuritySettingsService(user.companyId);
    const isStillRequired = isMfaRequiredForUserService({
      user: {
        ...user,
        security: {
          ...user.security,
          mfaEnabled: false,
        },
      },
      authorizationContext,
      settings,
    });

    if (isStillRequired) {
      return res.status(400).json({
        message:
          'Este usuario permanece em perfil critico e nao pode desativar MFA nesta politica.',
      });
    }

    const security = await prisma.userSecurity.upsert({
      where: { userId: Number(user.id) },
      create: {
        userId: Number(user.id),
        companyId: Number(user.companyId),
        mfaEnabled: false,
        mfaRequired: false,
      },
      update: {
        mfaEnabled: false,
        mfaRequired: false,
      },
    });

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'user_security',
      entityId: user.id,
      action: 'MFA_DISABLED',
      severity: 'CRITICAL',
      summary: 'MFA desativado pelo usuario autenticado',
    });

    return res.status(200).json({
      message: 'MFA desativado com sucesso',
      security,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao desativar MFA',
    });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user?.sessionId) {
      await revokeSessionService({
        sessionId: req.user.sessionId,
        reason: 'LOGOUT',
      });

      await createAuditLog({
        req,
        module: 'security',
        entityType: 'session',
        entityId: req.user.sessionId,
        action: 'LOGOUT',
        severity: 'INFO',
        summary: 'Sessao encerrada pelo usuario',
      });
    }

    return res.status(200).json({
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao encerrar sessao',
    });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await listUserSessionsService({
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return res.status(200).json({
      message: 'Sessoes carregadas com sucesso',
      sessions,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao carregar sessoes',
    });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const target = await prisma.userSession.findFirst({
      where: {
        id: Number(req.params.id),
        userId: Number(req.user.userId),
        companyId: Number(req.user.companyId),
      },
    });

    if (!target) {
      return res.status(404).json({
        message: 'Sessao nao encontrada',
      });
    }

    await revokeSessionService({
      sessionId: target.id,
      reason: 'USER_REVOKED',
    });

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'session',
      entityId: target.id,
      action: 'SESSION_REVOKED',
      severity: 'WARNING',
      summary: 'Sessao revogada manualmente pelo usuario',
    });

    return res.status(200).json({
      message: 'Sessao revogada com sucesso',
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao revogar sessao',
    });
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    await revokeAllUserSessionsService({
      userId: req.user.userId,
      exceptSessionId: req.user.sessionId,
      reason: 'USER_REVOKED_ALL',
    });

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'session',
      entityId: req.user.userId,
      action: 'SESSION_REVOKED',
      severity: 'WARNING',
      summary: 'Todas as demais sessoes do usuario foram encerradas',
    });

    return res.status(200).json({
      message: 'Demais sessoes encerradas com sucesso',
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao encerrar demais sessoes',
    });
  }
};

export const reauthenticate = async (req, res) => {
  const { password, code, challengeToken } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(req.user.userId),
      },
      include: {
        company: true,
        security: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario nao encontrado',
      });
    }

    if (challengeToken && code) {
      const challenge = await consumeAuthChallengeService({
        challengeToken,
        code,
        expectedPurpose: 'REAUTH',
      });

      const reauthAt = await markUserReauthenticatedService({
        userId: challenge.user.id,
        companyId: challenge.user.companyId,
        sessionId: req.user.sessionId,
      });

      await createAuditLog({
        req,
        module: 'security',
        entityType: 'session',
        entityId: req.user.sessionId,
        action: 'REAUTH',
        severity: 'INFO',
        summary: 'Reautenticacao concluida com MFA',
      });

      return res.status(200).json({
        message: 'Reautenticacao validada com sucesso',
        reauthAt,
      });
    }

    if (!password) {
      return res.status(400).json({
        message: 'Senha obrigatoria para reautenticacao',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      await createAuditLog({
        req,
        module: 'security',
        entityType: 'session',
        entityId: req.user.sessionId,
        action: 'REAUTH_FAILED',
        severity: 'WARNING',
        summary: 'Falha de reautenticacao por senha invalida',
      });

      return res.status(401).json({
        message: 'Senha invalida para reautenticacao',
      });
    }

    const authorizationContext = await resolveUserPermissionContext(
      user.id,
      user.role
    );
    const settings = await getSecuritySettingsService(user.companyId);
    const mfaRequired = isMfaRequiredForUserService({
      user,
      authorizationContext,
      settings,
    });

    if (mfaRequired) {
      const challenge = await createAuthChallengeService({
        user,
        purpose: 'REAUTH',
        metadata: {
          sessionId: req.user.sessionId,
        },
      });

      return res.status(200).json({
        message: 'Codigo de reautenticacao enviado com sucesso',
        state: 'REAUTH_MFA_REQUIRED',
        challengeToken: challenge.challengeToken,
        maskedEmail: challenge.maskedEmail,
        expiresAt: challenge.expiresAt,
      });
    }

    const reauthAt = await markUserReauthenticatedService({
      userId: user.id,
      companyId: user.companyId,
      sessionId: req.user.sessionId,
    });

    await createAuditLog({
      req,
      module: 'security',
      entityType: 'session',
      entityId: req.user.sessionId,
      action: 'REAUTH',
      severity: 'INFO',
      summary: 'Reautenticacao concluida com senha',
    });

    return res.status(200).json({
      message: 'Reautenticacao validada com sucesso',
      reauthAt,
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao reautenticar usuario',
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || !String(email).trim()) {
      return res.status(400).json({
        message: 'E-mail e obrigatorio',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const frontendUrl =
        process.env.FRONTEND_URL?.replace(/\/$/, '') ||
        'http://localhost:5173';

      const resetChallenge = await createPasswordResetChallengeService({
        user,
        req,
      });

      const resetLink = `${frontendUrl}/reset-password?token=${resetChallenge.token}`;

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
      });

      await createAuditLog({
        req,
        companyId: user.companyId,
        user: {
          userId: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
        },
        module: 'security',
        entityType: 'password_reset',
        entityId: resetChallenge.id,
        action: 'RESET_PASSWORD_REQUEST',
        severity: 'WARNING',
        summary: 'Solicitacao de reset de senha registrada',
      });
    }

    return res.status(200).json({
      message:
        'Se existir uma conta com este e-mail, voce recebera um link para redefinir sua senha.',
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    return res.status(500).json({
      message: 'Erro ao solicitar redefinicao de senha',
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({
        message: 'Token e nova senha sao obrigatorios',
      });
    }

    const challenge = await consumePasswordResetChallengeService({
      token,
    });
    const user = await prisma.user.findUnique({
      where: { id: Number(challenge.userId) },
      include: {
        security: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario nao encontrado',
      });
    }

    const validatedPassword = await validatePasswordPolicyService({
      companyId: user.companyId,
      password,
      userId: user.id,
    });
    const hashedPassword = await bcrypt.hash(validatedPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    await registerPasswordHistoryService(user.id, hashedPassword);
    await revokeAllUserSessionsService({
      userId: user.id,
      reason: 'PASSWORD_RESET',
    });

    await createAuditLog({
      req,
      companyId: user.companyId,
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
      },
      module: 'security',
      entityType: 'password_reset',
      entityId: challenge.id,
      action: 'RESET_PASSWORD',
      severity: 'CRITICAL',
      summary: `Senha redefinida via fluxo seguro para ${user.email}`,
    });

    return res.status(200).json({
      message: 'Senha redefinida com sucesso',
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);

    return res.status(error?.statusCode || 500).json({
      message: error.message || 'Erro ao redefinir senha',
    });
  }
};
