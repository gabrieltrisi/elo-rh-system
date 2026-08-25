import prisma from '../prisma/client.js';
import AppError from '../errors/AppError.js';
import { createAuditLog } from './auditService.js';
import { SECURITY_SETTINGS_DEFAULTS } from './securitySettingsService.js';

const SETTINGS_NAMESPACES = {
  payroll: 'payroll',
  time: 'time',
  documents: 'documents',
  reports: 'reports',
  security: 'security',
  notifications: 'notifications',
  templates: 'templates',
  performance: 'performance',
  system: 'system',
};

export const PERFORMANCE_WEIGHT_DEFAULTS = {
  punctuality: 20,
  attendance: 15,
  efficiency: 20,
  behavior: 15,
  peerFeedback: 10,
  externalFeedback: 10,
  trainings: 10,
};

const SETTINGS_DEFAULTS = {
  payroll: {
    closingDay: 25,
    paymentDay: 5,
    delayToleranceMinutes: 10,
    bankHoursRule: 'COMPENSACAO_MENSAL',
    overtimePercent50: 50,
    overtimePercent100: 100,
    defaultNotes: '',
    defaultCompetenceWindow: 'MENSAL',
    allowReopen: true,
  },
  time: {
    importLayout: 'AUTO',
    employeeRecognitionOrder: ['employeeCode', 'cpf', 'name'],
    standardJourneyHours: 8,
    delayToleranceMinutes: 10,
    bankHoursEnabled: true,
    importMode: 'PREVIEW_OBRIGATORIA',
    duplicatePolicy: 'BLOQUEAR',
  },
  documents: {
    defaultValidityDays: 365,
    alertDaysBeforeExpiry: 30,
    defaultStatus: 'ATIVO',
    categories: [
      'Contrato',
      'Documento pessoal',
      'Comprovante',
      'Treinamento',
      'Admissao',
    ],
    requiredContexts: ['ADMISSAO', 'COMPLIANCE', 'DP'],
    automaticAlerts: true,
  },
  reports: {
    headerTitle: 'EloSystem',
    footerText: 'Relatorio gerado pelo EloSystem',
    signatureLabel: 'Area responsavel',
    preferredFormat: 'EXCEL',
    includeCompanyBranding: true,
    includeGeneratedAt: true,
  },
  security: {
    ...SECURITY_SETTINGS_DEFAULTS,
  },
  notifications: {
    notifyExpiringDocuments: true,
    notifyCriticalPendingItems: true,
    notifyPayrollEvents: true,
    notifyByEmail: true,
    notifyInApp: true,
    digestFrequency: 'DIARIO',
  },
  templates: {
    warningTemplate: 'Advertencia padrao do EloSystem',
    suspensionTemplate: 'Suspensao padrao do EloSystem',
    onboardingTemplate: 'Onboarding padrao do EloSystem',
    hrDocumentTemplate: 'Cabecalho padrao RH',
    defaultHeader: 'EloSystem',
    defaultFooter: 'Documento controlado pelo EloSystem',
  },
  performance: {
    weights: PERFORMANCE_WEIGHT_DEFAULTS,
  },
  system: {
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'America/Sao_Paulo',
    systemLabel: 'EloSystem',
    compactMode: false,
    preferExecutiveDashboard: true,
  },
};

const COMPANY_DEFAULTS = {
  tradeName: '',
  legalName: '',
  cnpj: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  logoUrl: '',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  primaryColor: '#0f172a',
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const mergeSectionDefaults = (namespace, value) => ({
  ...cloneJson(SETTINGS_DEFAULTS[namespace] || {}),
  ...(value && typeof value === 'object' ? value : {}),
});

const normalizePerformanceWeights = (payload = {}) => {
  const incomingWeights =
    payload.weights && typeof payload.weights === 'object'
      ? payload.weights
      : payload;
  const weights = Object.entries(PERFORMANCE_WEIGHT_DEFAULTS).reduce(
    (acc, [key, fallback]) => {
      const parsed = Number(incomingWeights?.[key]);
      acc[key] = Number.isNaN(parsed) ? fallback : parsed;
      return acc;
    },
    {}
  );
  const total = Object.values(weights).reduce((acc, value) => acc + value, 0);

  if (Object.values(weights).some((value) => value < 0 || value > 100)) {
    throw new AppError('Cada peso de desempenho deve estar entre 0 e 100', 400);
  }

  if (Math.round(total * 100) / 100 !== 100) {
    throw new AppError('A soma dos pesos de desempenho deve ser 100%', 400);
  }

  return {
    weights,
  };
};

const normalizeSectionPayload = (namespace, payload) => {
  if (namespace === SETTINGS_NAMESPACES.performance) {
    return normalizePerformanceWeights(payload);
  }

  return payload;
};

const resolveSettingRecord = async (companyId, namespace) => {
  return prisma.systemSetting.findUnique({
    where: {
      companyId_namespace_settingKey: {
        companyId: Number(companyId),
        namespace,
        settingKey: 'default',
      },
    },
  });
};

const getOrCreateSection = async (companyId, namespace) => {
  const existing = await resolveSettingRecord(companyId, namespace);

  if (existing) {
    return {
      record: existing,
      value: mergeSectionDefaults(namespace, existing.value),
    };
  }

  const created = await prisma.systemSetting.create({
    data: {
      companyId: Number(companyId),
      namespace,
      settingKey: 'default',
      value: cloneJson(SETTINGS_DEFAULTS[namespace] || {}),
    },
  });

  return {
    record: created,
    value: mergeSectionDefaults(namespace, created.value),
  };
};

const buildCompanyPayload = (company) => ({
  name: company?.name || '',
  tradeName: company?.tradeName || '',
  legalName: company?.legalName || '',
  cnpj: company?.cnpj || '',
  email: company?.email || '',
  phone: company?.phone || '',
  address: company?.address || '',
  city: company?.city || '',
  state: company?.state || '',
  zipCode: company?.zipCode || '',
  logoUrl: company?.logoUrl || '',
  timezone: company?.timezone || COMPANY_DEFAULTS.timezone,
  language: company?.language || COMPANY_DEFAULTS.language,
  primaryColor: company?.primaryColor || COMPANY_DEFAULTS.primaryColor,
});

const buildSummary = ({ company, units, sections }) => {
  const activeUnits = units.filter((unit) => unit.status === 'ATIVA').length;
  const configuredSections = Object.values(sections).filter((section) => {
    if (!section || typeof section !== 'object') return false;
    return Object.values(section).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      return Boolean(value);
    });
  }).length;

  return {
    companyName: company.name,
    unitsCount: units.length,
    activeUnits,
    configuredSections,
    securityPolicy: sections.security?.passwordMinLength
      ? `${sections.security.passwordMinLength}+ caracteres`
      : 'Padrao',
    reportMode: sections.reports?.preferredFormat || 'EXCEL',
  };
};

export const getSettingsDashboardService = async (companyId) => {
  const [
    company,
    units,
    payroll,
    time,
    documents,
    reports,
    security,
    notifications,
    templates,
    performance,
    system,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: {
        id: Number(companyId),
      },
    }),
    prisma.companyUnit.findMany({
      where: {
        companyId: Number(companyId),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    }),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.payroll),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.time),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.documents),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.reports),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.security),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.notifications),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.templates),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.performance),
    getOrCreateSection(companyId, SETTINGS_NAMESPACES.system),
  ]);

  if (!company) {
    throw new AppError('Empresa nao encontrada', 404);
  }

  const sections = {
    company: buildCompanyPayload(company),
    payroll: payroll.value,
    time: time.value,
    documents: documents.value,
    reports: reports.value,
    security: security.value,
    notifications: notifications.value,
    templates: templates.value,
    performance: performance.value,
    system: {
      ...system.value,
      language: system.value.language || company.language || COMPANY_DEFAULTS.language,
      timezone: system.value.timezone || company.timezone || COMPANY_DEFAULTS.timezone,
    },
  };

  return {
    company: sections.company,
    units,
    sections,
    summary: buildSummary({
      company,
      units,
      sections,
    }),
  };
};

export const updateCompanySettingsService = async ({
  companyId,
  payload = {},
  user = null,
  req = null,
}) => {
  const before = await prisma.company.findUnique({
    where: {
      id: Number(companyId),
    },
  });

  if (!before) {
    throw new AppError('Empresa nao encontrada', 404);
  }

  const nextCompany = await prisma.company.update({
    where: {
      id: Number(companyId),
    },
    data: {
      name: normalizeString(payload.name) || before.name,
      tradeName: normalizeString(payload.tradeName),
      legalName: normalizeString(payload.legalName),
      cnpj: normalizeString(payload.cnpj),
      email: normalizeString(payload.email),
      phone: normalizeString(payload.phone),
      address: normalizeString(payload.address),
      city: normalizeString(payload.city),
      state: normalizeString(payload.state),
      zipCode: normalizeString(payload.zipCode),
      logoUrl: normalizeString(payload.logoUrl),
      timezone: normalizeString(payload.timezone) || COMPANY_DEFAULTS.timezone,
      language: normalizeString(payload.language) || COMPANY_DEFAULTS.language,
      primaryColor:
        normalizeString(payload.primaryColor) || COMPANY_DEFAULTS.primaryColor,
    },
  });

  await createAuditLog({
    req,
    user,
    companyId,
    module: 'settings',
    entityType: 'company_settings',
    entityId: String(companyId),
    action: 'UPDATE',
    severity: 'INFO',
    summary: 'Configuracoes institucionais da empresa atualizadas',
    before: buildCompanyPayload(before),
    after: buildCompanyPayload(nextCompany),
  });

  return buildCompanyPayload(nextCompany);
};

export const updateSettingsSectionService = async ({
  companyId,
  namespace,
  payload = {},
  user = null,
  req = null,
}) => {
  if (!SETTINGS_NAMESPACES[namespace]) {
    throw new AppError('Secao de configuracao invalida', 400);
  }

  const current = await getOrCreateSection(companyId, namespace);
  const normalizedPayload = normalizeSectionPayload(namespace, payload);
  const nextValue = mergeSectionDefaults(namespace, {
    ...current.value,
    ...normalizedPayload,
  });

  const updated = await prisma.systemSetting.upsert({
    where: {
      companyId_namespace_settingKey: {
        companyId: Number(companyId),
        namespace,
        settingKey: 'default',
      },
    },
    create: {
      companyId: Number(companyId),
      namespace,
      settingKey: 'default',
      value: cloneJson(nextValue),
      updatedByUserId: user?.userId ? Number(user.userId) : null,
    },
    update: {
      value: cloneJson(nextValue),
      updatedByUserId: user?.userId ? Number(user.userId) : null,
    },
  });

  await createAuditLog({
    req,
    user,
    companyId,
    module: 'settings',
    entityType: `${namespace}_settings`,
    entityId: String(updated.id),
    action: 'UPDATE',
    severity: ['security', 'performance'].includes(namespace)
      ? 'WARNING'
      : 'INFO',
    summary: `Configuracoes da secao ${namespace} atualizadas`,
    before: current.value,
    after: nextValue,
  });

  return nextValue;
};

export const createCompanyUnitService = async ({
  companyId,
  payload = {},
  user = null,
  req = null,
}) => {
  const unit = await prisma.companyUnit.create({
    data: {
      companyId: Number(companyId),
      name: normalizeString(payload.name) || 'Nova unidade',
      code: normalizeString(payload.code),
      cnpj: normalizeString(payload.cnpj),
      email: normalizeString(payload.email),
      phone: normalizeString(payload.phone),
      address: normalizeString(payload.address),
      city: normalizeString(payload.city),
      state: normalizeString(payload.state),
      zipCode: normalizeString(payload.zipCode),
      timezone: normalizeString(payload.timezone) || COMPANY_DEFAULTS.timezone,
      status: normalizeString(payload.status) || 'ATIVA',
      notes: normalizeString(payload.notes),
    },
  });

  await createAuditLog({
    req,
    user,
    companyId,
    module: 'settings',
    entityType: 'company_unit',
    entityId: String(unit.id),
    action: 'CREATE',
    severity: 'INFO',
    summary: `Unidade ${unit.name} criada nas configuracoes`,
    after: unit,
  });

  return unit;
};

export const updateCompanyUnitService = async ({
  companyId,
  unitId,
  payload = {},
  user = null,
  req = null,
}) => {
  const before = await prisma.companyUnit.findFirst({
    where: {
      id: Number(unitId),
      companyId: Number(companyId),
    },
  });

  if (!before) {
    throw new AppError('Unidade nao encontrada', 404);
  }

  const unit = await prisma.companyUnit.update({
    where: {
      id: Number(unitId),
    },
    data: {
      name: normalizeString(payload.name) || before.name,
      code: normalizeString(payload.code),
      cnpj: normalizeString(payload.cnpj),
      email: normalizeString(payload.email),
      phone: normalizeString(payload.phone),
      address: normalizeString(payload.address),
      city: normalizeString(payload.city),
      state: normalizeString(payload.state),
      zipCode: normalizeString(payload.zipCode),
      timezone: normalizeString(payload.timezone) || before.timezone,
      status: normalizeString(payload.status) || before.status,
      notes: normalizeString(payload.notes),
    },
  });

  await createAuditLog({
    req,
    user,
    companyId,
    module: 'settings',
    entityType: 'company_unit',
    entityId: String(unit.id),
    action: 'UPDATE',
    severity: 'INFO',
    summary: `Unidade ${unit.name} atualizada nas configuracoes`,
    before,
    after: unit,
  });

  return unit;
};

export const updateCompanyUnitStatusService = async ({
  companyId,
  unitId,
  status,
  user = null,
  req = null,
}) => {
  const before = await prisma.companyUnit.findFirst({
    where: {
      id: Number(unitId),
      companyId: Number(companyId),
    },
  });

  if (!before) {
    throw new AppError('Unidade nao encontrada', 404);
  }

  const unit = await prisma.companyUnit.update({
    where: {
      id: Number(unitId),
    },
    data: {
      status: normalizeString(status) || before.status,
    },
  });

  await createAuditLog({
    req,
    user,
    companyId,
    module: 'settings',
    entityType: 'company_unit',
    entityId: String(unit.id),
    action: 'UPDATE',
    severity: 'WARNING',
    summary: `Status da unidade ${unit.name} alterado para ${unit.status}`,
    before,
    after: unit,
  });

  return unit;
};

export const SETTINGS_SECTION_ORDER = [
  'company',
  'units',
  'payroll',
  'time',
  'documents',
  'reports',
  'security',
  'notifications',
  'templates',
  'performance',
  'system',
];

export const getPerformanceWeightsSettingsService = async (companyId) => {
  const current = await getOrCreateSection(
    companyId,
    SETTINGS_NAMESPACES.performance
  );

  return normalizePerformanceWeights(current.value).weights;
};
