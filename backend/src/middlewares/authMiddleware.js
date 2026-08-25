import prisma from '../prisma/client.js';
import { resolveUserPermissionContext } from '../services/profileService.js';
import {
  touchUserSessionService,
  verifyAuthToken,
} from '../services/authSecurityService.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token nao fornecido',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({
      message: 'Token mal formatado',
      code: 'AUTH_TOKEN_INVALID',
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({
      message: 'Token mal formatado',
      code: 'AUTH_TOKEN_INVALID',
    });
  }

  try {
    const decoded = verifyAuthToken(token);

    if (!decoded?.userId || !decoded?.sessionId || !decoded?.tokenId) {
      return res.status(401).json({
        message: 'Sessao invalida ou expirada',
        code: 'AUTH_SESSION_LEGACY',
      });
    }

    const session = await prisma.userSession.findFirst({
      where: {
        id: Number(decoded.sessionId),
        userId: Number(decoded.userId),
        tokenId: String(decoded.tokenId),
      },
    });

    if (!session) {
      return res.status(401).json({
        message: 'Sessao invalida ou revogada',
        code: 'AUTH_SESSION_NOT_FOUND',
      });
    }

    if (session.revokedAt) {
      return res.status(401).json({
        message: 'Sessao invalida ou revogada',
        code: 'AUTH_SESSION_REVOKED',
      });
    }

    const [user, refreshedSession] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: Number(decoded.userId),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          companyId: true,
          employeeId: true,
          security: true,
        },
      }),
      touchUserSessionService(session.id),
    ]);

    if (!user) {
      return res.status(401).json({
        message: 'Usuario nao encontrado',
      });
    }

    if (user.status !== 'ATIVO') {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedReason: `USER_STATUS_${user.status}`,
        },
      });

      return res.status(401).json({
        message: 'Usuario inativo ou bloqueado',
        code: 'AUTH_USER_INACTIVE',
      });
    }

    const companyId =
      user.companyId !== undefined && user.companyId !== null
        ? Number(user.companyId)
        : null;
    const authorizationContext = await resolveUserPermissionContext(
      user.id,
      user.role
    );

    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: authorizationContext.effectiveRole || user.role,
      status: user.status,
      companyId,
      employeeId: user.employeeId,
      profiles: authorizationContext.profileSlugs || [],
      permissions: authorizationContext.permissions || [],
      primaryProfile: authorizationContext.primaryProfile || null,
      sessionId: refreshedSession.id,
      tokenId: refreshedSession.tokenId,
      mfaVerifiedAt: refreshedSession.mfaVerifiedAt,
      reauthAt: refreshedSession.reauthAt,
    };

    if (!req.user.companyId) {
      return res.status(401).json({
        message: 'Token sem companyId valido',
        code: 'AUTH_COMPANY_CONTEXT_INVALID',
      });
    }

    return next();
  } catch (error) {
    const isTokenExpired = error?.name === 'TokenExpiredError';
    const code = error?.statusCode === 401 ? 'AUTH_SESSION_EXPIRED' : 'AUTH_TOKEN_INVALID';

    return res.status(401).json({
      message: isTokenExpired ? 'Sessao expirada' : error?.message || 'Sessao invalida ou expirada',
      code: isTokenExpired ? 'AUTH_TOKEN_EXPIRED' : code,
    });
  }
};

export default authMiddleware;
