import prisma from '../prisma/client.js';

const safeJson = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

const normalizeSnapshotString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

export const createAuditLog = async ({
  req = null,
  user = null,
  companyId = null,
  module,
  entityType,
  entityId = null,
  action,
  severity = 'INFO',
  summary,
  details = null,
  before = null,
  after = null,
} = {}) => {
  if (!module || !entityType || !action || !summary) {
    return null;
  }

  const resolvedUser = user || req?.user || null;
  const resolvedCompanyId =
    companyId ??
    resolvedUser?.companyId ??
    details?.companyId ??
    before?.companyId ??
    after?.companyId ??
    null;

  if (!resolvedCompanyId) {
    return null;
  }

  return prisma.auditLog.create({
    data: {
      companyId: Number(resolvedCompanyId),
      userId: resolvedUser?.userId ? Number(resolvedUser.userId) : null,
      userNameSnapshot: normalizeSnapshotString(resolvedUser?.name),
      userEmailSnapshot: normalizeSnapshotString(resolvedUser?.email),
      module: String(module),
      entityType: String(entityType),
      entityId:
        entityId === undefined || entityId === null ? null : String(entityId),
      action: String(action).toUpperCase(),
      severity: String(severity || 'INFO').toUpperCase(),
      summary: String(summary),
      detailsJson: safeJson(details),
      beforeJson: safeJson(before),
      afterJson: safeJson(after),
      ipAddress: normalizeSnapshotString(req?.auditContext?.ipAddress),
      userAgent: normalizeSnapshotString(req?.auditContext?.userAgent),
      requestId: normalizeSnapshotString(req?.auditContext?.requestId),
    },
  });
};

export const getAuditLogsService = async (query = {}, user) => {
  const companyId = Number(user?.companyId);
  const search = String(query.search || '').trim();
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);
  const skip = (page - 1) * limit;
  const where = {
    companyId,
  };

  if (query.userId) {
    where.userId = Number(query.userId);
  }

  if (query.module && query.module !== 'TODOS') {
    where.module = String(query.module);
  }

  if (query.action && query.action !== 'TODOS') {
    where.action = String(query.action).toUpperCase();
  }

  if (query.severity && query.severity !== 'TODOS') {
    where.severity = String(query.severity).toUpperCase();
  }

  if (query.entityType && query.entityType !== 'TODOS') {
    where.entityType = String(query.entityType);
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};

    if (query.startDate) {
      where.createdAt.gte = new Date(query.startDate);
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  if (search) {
    where.OR = [
      { summary: { contains: search, mode: 'insensitive' } },
      { module: { contains: search, mode: 'insensitive' } },
      { action: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      { userNameSnapshot: { contains: search, mode: 'insensitive' } },
      { userEmailSnapshot: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [logs, total, criticalCount, todayCount, groupedByModule, activeUsers] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          ...where,
          severity: 'CRITICAL',
        },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: {
          module: true,
        },
        orderBy: {
          _count: {
            module: 'desc',
          },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['userId', 'userNameSnapshot'],
        where: {
          ...where,
          userId: {
            not: null,
          },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 1,
      }),
    ]);

  return {
    logs,
    summary: {
      total,
      criticalCount,
      todayCount,
      topModule: groupedByModule[0]
        ? {
            module: groupedByModule[0].module,
            count: groupedByModule[0]._count.module,
          }
        : null,
      mostActiveUser: activeUsers[0]
        ? {
            userId: activeUsers[0].userId,
            name: activeUsers[0].userNameSnapshot,
            count: activeUsers[0]._count.userId,
          }
        : null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getAuditLogByIdService = async (id, user) => {
  return prisma.auditLog.findFirst({
    where: {
      id: Number(id),
      companyId: Number(user.companyId),
    },
  });
};
