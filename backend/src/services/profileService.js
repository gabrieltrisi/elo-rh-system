import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_PROFILE_SLUG_BY_ROLE,
  PERMISSION_DEFINITIONS,
  SYSTEM_PROFILE_DEFINITIONS,
  SYSTEM_PROFILE_SLUGS,
} from '../utils/permissions.js';

const profileInclude = {
  profilePermissions: {
    include: {
      permission: true,
    },
    orderBy: {
      permission: {
        key: 'asc',
      },
    },
  },
  userProfiles: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  company: true,
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeSlug = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    throw new AppError('Chave do perfil é obrigatória', 400);
  }

  return normalized;
};

const sanitizePermission = (permission) => ({
  id: permission.id,
  module: permission.module,
  action: permission.action,
  key: permission.key,
  description: permission.description,
  createdAt: permission.createdAt,
  updatedAt: permission.updatedAt,
});

const sanitizeProfile = (profile) => {
  const permissions = (profile.profilePermissions || []).map((item) =>
    sanitizePermission(item.permission)
  );
  const linkedUsers = (profile.userProfiles || []).map((item) => ({
    id: item.user.id,
    name: item.user.name,
    email: item.user.email,
    status: item.user.status,
    role: item.user.role,
    isPrimary: Boolean(item.isPrimary),
  }));

  return {
    id: profile.id,
    name: profile.name,
    slug: profile.slug,
    description: profile.description,
    type: profile.type,
    isSystem: Boolean(profile.isSystem),
    isActive: Boolean(profile.isActive),
    companyId: profile.companyId,
    companyName: profile.company?.name || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    permissions,
    permissionCount: permissions.length,
    users: linkedUsers,
    userCount: linkedUsers.length,
  };
};

const ensureUniqueSlug = async (slug, excludeId = null) => {
  const existingProfile = await prisma.profile.findUnique({
    where: { slug },
  });

  if (existingProfile && existingProfile.id !== Number(excludeId)) {
    throw new AppError('Já existe um perfil com esta chave', 400);
  }
};

const ensurePermissionsExist = async () => {
  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }
};

const syncSystemProfiles = async () => {
  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: ALL_PERMISSION_KEYS,
      },
    },
  });

  const permissionMap = new Map(permissions.map((permission) => [permission.key, permission]));

  for (const profileDefinition of SYSTEM_PROFILE_DEFINITIONS) {
    const profile = await prisma.profile.upsert({
      where: { slug: profileDefinition.slug },
      update: {
        name: profileDefinition.name,
        description: profileDefinition.description,
        type: profileDefinition.type,
        isSystem: profileDefinition.isSystem,
        isActive: true,
      },
      create: {
        name: profileDefinition.name,
        slug: profileDefinition.slug,
        description: profileDefinition.description,
        type: profileDefinition.type,
        isSystem: profileDefinition.isSystem,
        isActive: true,
      },
    });

    await prisma.profilePermission.deleteMany({
      where: {
        profileId: profile.id,
      },
    });

    const targetPermissionKeys =
      profileDefinition.permissions.includes('*')
        ? ALL_PERMISSION_KEYS
        : profileDefinition.permissions;

    if (targetPermissionKeys.length > 0) {
      await prisma.profilePermission.createMany({
        data: targetPermissionKeys
          .map((key) => permissionMap.get(key))
          .filter(Boolean)
          .map((permission) => ({
            profileId: profile.id,
            permissionId: permission.id,
          })),
        skipDuplicates: true,
      });
    }
  }
};

const ensureUsersHavePrimaryProfile = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
    },
  });

  const profiles = await prisma.profile.findMany({
    where: {
      slug: {
        in: SYSTEM_PROFILE_SLUGS,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const profileMap = new Map(profiles.map((profile) => [profile.slug, profile.id]));

  for (const user of users) {
    const targetSlug = DEFAULT_PROFILE_SLUG_BY_ROLE[user.role] || 'VISUALIZADOR';
    const targetProfileId = profileMap.get(targetSlug);

    if (!targetProfileId) continue;

    const existingPrimary = await prisma.userProfile.findFirst({
      where: {
        userId: user.id,
        isPrimary: true,
      },
    });

    if (!existingPrimary) {
      await prisma.userProfile.upsert({
        where: {
          userId_profileId: {
            userId: user.id,
            profileId: targetProfileId,
          },
        },
        update: {
          isPrimary: true,
        },
        create: {
          userId: user.id,
          profileId: targetProfileId,
          isPrimary: true,
        },
      });
    }
  }
};

export const ensureAuthorizationStructure = async () => {
  await ensurePermissionsExist();
  await syncSystemProfiles();
  await ensureUsersHavePrimaryProfile();
};

export const resolveUserPermissionContext = async (userId, fallbackRole = null) => {
  await ensureAuthorizationStructure();

  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
    include: {
      userProfiles: {
        include: {
          profile: {
            include: {
              profilePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado para resolver permissões', 404);
  }

  const assignedProfiles = user.userProfiles.map((item) => item.profile);
  const primaryProfile =
    user.userProfiles.find((item) => item.isPrimary)?.profile ||
    assignedProfiles[0] ||
    null;

  const profileSlugs = assignedProfiles.map((profile) => profile.slug);
  const effectiveRole = primaryProfile?.slug || fallbackRole || user.role;
  const permissionSet = new Set();

  for (const profile of assignedProfiles) {
    if (!profile.isActive) continue;

    for (const profilePermission of profile.profilePermissions || []) {
      if (profilePermission.permission?.key) {
        permissionSet.add(profilePermission.permission.key);
      }
    }
  }

  if (effectiveRole === 'SUPER_ADMIN' || profileSlugs.includes('SUPER_ADMIN')) {
    permissionSet.add('*');
  }

  return {
    effectiveRole,
    profileSlugs,
    permissions: Array.from(permissionSet),
    primaryProfile: primaryProfile
      ? {
          id: primaryProfile.id,
          name: primaryProfile.name,
          slug: primaryProfile.slug,
        }
      : null,
  };
};

export const getAllPermissionsService = async () => {
  await ensureAuthorizationStructure();

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }

    acc[permission.module].push(sanitizePermission(permission));
    return acc;
  }, {});

  return {
    permissions: permissions.map(sanitizePermission),
    grouped,
    total: permissions.length,
  };
};

export const getAllProfilesService = async (filters = {}) => {
  await ensureAuthorizationStructure();

  const where = {};
  const search = normalizeOptionalString(filters.search);
  const type = normalizeOptionalString(filters.type)?.toUpperCase();
  const status = normalizeOptionalString(filters.status)?.toUpperCase();

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (type === 'SYSTEM' || type === 'CUSTOM') {
    where.type = type;
  }

  if (status === 'ATIVO') {
    where.isActive = true;
  }

  if (status === 'INATIVO') {
    where.isActive = false;
  }

  const profiles = await prisma.profile.findMany({
    where,
    include: profileInclude,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  const sanitizedProfiles = profiles.map(sanitizeProfile);

  const summary = {
    totalProfiles: sanitizedProfiles.length,
    totalPermissions: (await prisma.permission.count()),
    activeProfiles: sanitizedProfiles.filter((profile) => profile.isActive).length,
    systemProfiles: sanitizedProfiles.filter((profile) => profile.isSystem).length,
    customProfiles: sanitizedProfiles.filter((profile) => !profile.isSystem).length,
    withoutUsers: sanitizedProfiles.filter((profile) => profile.userCount === 0).length,
    mostPermissionsProfile:
      sanitizedProfiles
        .slice()
        .sort((a, b) => b.permissionCount - a.permissionCount)[0] || null,
  };

  return {
    profiles: sanitizedProfiles,
    summary,
  };
};

export const getProfileByIdService = async (id) => {
  await ensureAuthorizationStructure();

  const profile = await prisma.profile.findUnique({
    where: {
      id: Number(id),
    },
    include: profileInclude,
  });

  if (!profile) {
    throw new AppError('Perfil não encontrado', 404);
  }

  return sanitizeProfile(profile);
};

export const createProfileService = async (data) => {
  await ensureAuthorizationStructure();

  const name = normalizeOptionalString(data.name);
  const slug = normalizeSlug(data.slug || data.name);
  const description = normalizeOptionalString(data.description);
  const isActive = data.isActive !== false;
  const companyId = data.companyId ? Number(data.companyId) : null;
  const requestedPermissions = Array.isArray(data.permissions)
    ? data.permissions.map((permission) => String(permission))
    : [];

  if (!name) {
    throw new AppError('Nome do perfil é obrigatório', 400);
  }

  await ensureUniqueSlug(slug);

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: requestedPermissions,
      },
    },
  });

  const profile = await prisma.profile.create({
    data: {
      name,
      slug,
      description,
      type: 'CUSTOM',
      isSystem: false,
      isActive,
      companyId,
      profilePermissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
    },
    include: profileInclude,
  });

  return sanitizeProfile(profile);
};

export const updateProfileService = async (id, data) => {
  await ensureAuthorizationStructure();

  const currentProfile = await prisma.profile.findUnique({
    where: {
      id: Number(id),
    },
    include: profileInclude,
  });

  if (!currentProfile) {
    throw new AppError('Perfil não encontrado', 404);
  }

  const name = normalizeOptionalString(data.name);
  const slug = normalizeSlug(data.slug || currentProfile.slug);
  const description = normalizeOptionalString(data.description);
  const isActive =
    typeof data.isActive === 'boolean' ? data.isActive : currentProfile.isActive;
  const requestedPermissions = Array.isArray(data.permissions)
    ? data.permissions.map((permission) => String(permission))
    : null;

  if (!name) {
    throw new AppError('Nome do perfil é obrigatório', 400);
  }

  if (currentProfile.isSystem && !SYSTEM_PROFILE_SLUGS.includes(currentProfile.slug)) {
    throw new AppError('Perfil do sistema protegido', 400);
  }

  await ensureUniqueSlug(slug, id);

  let permissions = null;

  if (requestedPermissions) {
    permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: requestedPermissions,
        },
      },
    });
  }

  const profile = await prisma.$transaction(async (tx) => {
    if (requestedPermissions) {
      await tx.profilePermission.deleteMany({
        where: {
          profileId: Number(id),
        },
      });
    }

    const updatedProfile = await tx.profile.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        slug,
        description,
        isActive,
      },
      include: profileInclude,
    });

    if (requestedPermissions && permissions?.length) {
      await tx.profilePermission.createMany({
        data: permissions.map((permission) => ({
          profileId: updatedProfile.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    return tx.profile.findUnique({
      where: {
        id: updatedProfile.id,
      },
      include: profileInclude,
    });
  });

  return sanitizeProfile(profile);
};

export const duplicateProfileService = async (id) => {
  await ensureAuthorizationStructure();

  const profile = await prisma.profile.findUnique({
    where: {
      id: Number(id),
    },
    include: profileInclude,
  });

  if (!profile) {
    throw new AppError('Perfil não encontrado', 404);
  }

  const duplicatedSlug = `${profile.slug}_COPY_${Date.now()}`;

  const duplicatedProfile = await prisma.profile.create({
    data: {
      name: `${profile.name} (Cópia)`,
      slug: duplicatedSlug,
      description: profile.description,
      type: 'CUSTOM',
      isSystem: false,
      isActive: true,
      companyId: profile.companyId,
      profilePermissions: {
        create: (profile.profilePermissions || []).map((item) => ({
          permissionId: item.permissionId,
        })),
      },
    },
    include: profileInclude,
  });

  return sanitizeProfile(duplicatedProfile);
};

export const updateProfileStatusService = async (id, isActive) => {
  await ensureAuthorizationStructure();

  const profile = await prisma.profile.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!profile) {
    throw new AppError('Perfil não encontrado', 404);
  }

  if (profile.isSystem && profile.slug === 'SUPER_ADMIN' && !isActive) {
    throw new AppError('Não é permitido inativar o perfil SUPER_ADMIN', 400);
  }

  const updatedProfile = await prisma.profile.update({
    where: {
      id: Number(id),
    },
    data: {
      isActive: Boolean(isActive),
    },
    include: profileInclude,
  });

  return sanitizeProfile(updatedProfile);
};

export const assignPermissionsToProfileService = async (id, permissionKeys = []) => {
  await ensureAuthorizationStructure();

  const profile = await prisma.profile.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!profile) {
    throw new AppError('Perfil não encontrado', 404);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionKeys.map((permission) => String(permission)),
      },
    },
  });

  const updatedProfile = await prisma.$transaction(async (tx) => {
    await tx.profilePermission.deleteMany({
      where: {
        profileId: Number(id),
      },
    });

    if (permissions.length > 0) {
      await tx.profilePermission.createMany({
        data: permissions.map((permission) => ({
          profileId: Number(id),
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    return tx.profile.findUnique({
      where: {
        id: Number(id),
      },
      include: profileInclude,
    });
  });

  return sanitizeProfile(updatedProfile);
};

export const assignProfilesToUserService = async (userId, profileIds = []) => {
  await ensureAuthorizationStructure();

  const normalizedProfileIds = Array.from(
    new Set(
      profileIds
        .map((profileId) => Number(profileId))
        .filter((profileId) => !Number.isNaN(profileId))
    )
  );

  if (normalizedProfileIds.length === 0) {
    throw new AppError('Selecione ao menos um perfil para o usuário', 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const profiles = await prisma.profile.findMany({
    where: {
      id: {
        in: normalizedProfileIds,
      },
    },
  });

  if (profiles.length !== normalizedProfileIds.length) {
    throw new AppError('Um ou mais perfis informados são inválidos', 400);
  }

  const primaryProfile =
    profiles.find((profile) => profile.slug === user.role) || profiles[0];

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.deleteMany({
      where: {
        userId: Number(userId),
      },
    });

    await tx.userProfile.createMany({
      data: normalizedProfileIds.map((profileId) => ({
        userId: Number(userId),
        profileId,
        isPrimary: profileId === primaryProfile.id,
      })),
      skipDuplicates: true,
    });

    await tx.user.update({
      where: {
        id: Number(userId),
      },
      data: {
        role: primaryProfile.slug,
      },
    });
  });

  return resolveUserPermissionContext(userId, user.role);
};
