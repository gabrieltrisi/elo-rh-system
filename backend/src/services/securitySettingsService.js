import prisma from '../prisma/client.js';

export const SECURITY_SETTINGS_DEFAULTS = {
  passwordMinLength: 12,
  forcePasswordChange: true,
  sessionTimeoutMinutes: 120,
  absoluteSessionHours: 24,
  enableMfaReady: true,
  mfaRequiredForPrivileged: true,
  mfaOptionalForRh: true,
  maxLoginAttempts: 5,
  loginLockMinutes: 15,
  reauthWindowMinutes: 20,
  blockInactiveUsers: true,
  loginAuditLevel: 'PADRAO',
  blockCommonPasswords: true,
};

const mergeDefaults = (value) => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  ...(value && typeof value === 'object' ? value : {}),
});

export const getSecuritySettingsService = async (companyId) => {
  if (!companyId) {
    return SECURITY_SETTINGS_DEFAULTS;
  }

  const record = await prisma.systemSetting.findUnique({
    where: {
      companyId_namespace_settingKey: {
        companyId: Number(companyId),
        namespace: 'security',
        settingKey: 'default',
      },
    },
  });

  return mergeDefaults(record?.value);
};
