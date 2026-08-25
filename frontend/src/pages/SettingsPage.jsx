import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const SECTION_ORDER = [
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

const SECTION_META = {
  company: {
    title: 'Empresa',
    eyebrow: 'Base institucional',
    description:
      'Identidade da empresa, contatos oficiais, endereco e configuracoes corporativas que sustentam todo o EloSystem.',
    accent: 'from-slate-950 via-slate-900 to-indigo-900',
    badge: 'Institucional',
  },
  units: {
    title: 'Filiais / Unidades',
    eyebrow: 'Base multiempresa',
    description:
      'Governanca da estrutura organizacional para filiais, unidades e expansoes futuras com vinculo operacional.',
    accent: 'from-slate-950 via-slate-900 to-cyan-900',
    badge: 'Escalavel',
  },
  payroll: {
    title: 'Folha de Pagamento',
    eyebrow: 'Departamento Pessoal',
    description:
      'Parametros operacionais da folha, competencias, tolerancias e padroes que apoiam o processamento mensal.',
    accent: 'from-slate-950 via-slate-900 to-emerald-900',
    badge: 'DP',
  },
  time: {
    title: 'Jornada',
    eyebrow: 'Folha de ponto',
    description:
      'Parametros de importacao, reconhecimento de colaborador e regras-base para consolidacao da jornada.',
    accent: 'from-slate-950 via-slate-900 to-violet-900',
    badge: 'Operacional',
  },
  documents: {
    title: 'Documentos',
    eyebrow: 'Compliance documental',
    description:
      'Categorias, alertas, validade e politicas base para documentos do RH, DP e compliance.',
    accent: 'from-slate-950 via-slate-900 to-amber-900',
    badge: 'Compliance',
  },
  reports: {
    title: 'Relatorios',
    eyebrow: 'Saida executiva',
    description:
      'Padroes de cabecalho, assinatura, exportacao e preferencia de formato para relatorios do sistema.',
    accent: 'from-slate-950 via-slate-900 to-sky-900',
    badge: 'Executivo',
  },
  security: {
    title: 'Seguranca',
    eyebrow: 'Governanca de acesso',
    description:
      'Politicas de senha, sessao e regras administrativas para acesso seguro e postura enterprise.',
    accent: 'from-slate-950 via-slate-900 to-rose-900',
    badge: 'Critico',
  },
  notifications: {
    title: 'Notificacoes',
    eyebrow: 'Alertas e automacoes',
    description:
      'Preferencias de envio, criticidade e frequencia para alertas operacionais do EloSystem.',
    accent: 'from-slate-950 via-slate-900 to-orange-900',
    badge: 'Comunicacao',
  },
  templates: {
    title: 'Templates',
    eyebrow: 'Padronizacao institucional',
    description:
      'Modelos base de advertencia, suspensao, onboarding e documentos internos para ganho de consistencia.',
    accent: 'from-slate-950 via-slate-900 to-fuchsia-900',
    badge: 'Padroes',
  },
  performance: {
    title: 'Desempenho',
    eyebrow: 'Pesos de avaliacao',
    description:
      'Parametrize a composicao da nota final de desempenho sem alterar codigo, mantendo calculo centralizado no backend.',
    accent: 'from-slate-950 via-slate-900 to-emerald-900',
    badge: 'Gestao',
  },
  system: {
    title: 'Preferencias do Sistema',
    eyebrow: 'Controle geral',
    description:
      'Idioma, timezone, formato de data e outras preferencias macro do comportamento do EloSystem.',
    accent: 'from-slate-950 via-slate-900 to-teal-900',
    badge: 'Sistema',
  },
};

const defaultSettings = {
  summary: {
    companyName: 'EloSystem',
    unitsCount: 0,
    activeUnits: 0,
    configuredSections: 0,
    securityPolicy: 'Padrao',
    reportMode: 'EXCEL',
  },
  company: {
    name: '',
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
  },
  units: [],
  sections: {
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
      categories: ['Contrato', 'Documento pessoal'],
      requiredContexts: ['ADMISSAO', 'COMPLIANCE'],
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
      blockCommonPasswords: true,
      loginAuditLevel: 'PADRAO',
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
      weights: {
        punctuality: 20,
        attendance: 15,
        efficiency: 20,
        behavior: 15,
        peerFeedback: 10,
        externalFeedback: 10,
        trainings: 10,
      },
    },
    system: {
      language: 'pt-BR',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'America/Sao_Paulo',
      systemLabel: 'EloSystem',
      compactMode: false,
      preferExecutiveDashboard: true,
    },
  },
};

const toneClasses = {
  slate: 'border-slate-200 bg-white text-slate-900',
  blue: 'border-blue-200 bg-blue-50 text-blue-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
};

const hasPermission = (currentUser, permission) => {
  const role = String(currentUser?.role || '').toUpperCase();
  const permissions = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : [];

  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    permissions.includes('*') ||
    permissions.includes(permission)
  );
};

const OverviewCard = ({ title, value, subtitle, tone = 'slate' }) => (
  <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses[tone]}`}>
    <p className='text-sm opacity-75'>{title}</p>
    <h3 className='mt-2 text-3xl font-bold'>{value}</h3>
    <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
  </div>
);

const ToggleField = ({ label, description, name, checked, onChange, disabled }) => (
  <label className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
    <div className='pr-4'>
      <p className='text-sm font-semibold text-slate-800'>{label}</p>
      <p className='mt-1 text-xs text-slate-500'>{description}</p>
    </div>
    <input
      type='checkbox'
      name={name}
      checked={Boolean(checked)}
      onChange={onChange}
      disabled={disabled}
      className='h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
    />
  </label>
);

const InputField = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  type = 'text',
  placeholder = '',
  as = 'input',
  rows = 4,
}) => (
  <label className='block text-sm font-semibold text-slate-700'>
    {label}
    {as === 'textarea' ? (
      <textarea
        name={name}
        value={value || ''}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
      />
    )}
  </label>
);

const SelectField = ({
  label,
  name,
  value,
  onChange,
  disabled = false,
  options = [],
}) => (
  <label className='block text-sm font-semibold text-slate-700'>
    {label}
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const PerformanceWeightField = ({ label, name, value, onChange, disabled }) => (
  <label className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
    <span className='block text-sm font-semibold text-slate-800'>{label}</span>
    <div className='mt-3 flex items-center gap-3'>
      <input
        type='number'
        min='0'
        max='100'
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
      />
      <span className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500'>
        %
      </span>
    </div>
  </label>
);

const UnitStatusBadge = ({ status }) => {
  const normalized = String(status || 'ATIVA').toUpperCase();
  const classes =
    normalized === 'ATIVA'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {normalized}
    </span>
  );
};

const SettingsPage = () => {
  const { user: currentUser } = useAuthSession();
  const canReadSettings = hasPermission(currentUser, 'settings.read');
  const canUpdateSettings = hasPermission(currentUser, 'settings.update');
  const canManageCompany = hasPermission(currentUser, 'settings.company');
  const canManagePayroll = hasPermission(currentUser, 'settings.payroll');
  const canManagePerformance = hasPermission(
    currentUser,
    'settings.performance'
  );
  const canManageSecurity = hasPermission(currentUser, 'settings.security');
  const canManageNotifications = hasPermission(
    currentUser,
    'settings.notifications'
  );

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [activeSection, setActiveSection] = useState('company');
  const [settingsData, setSettingsData] = useState(defaultSettings);
  const [forms, setForms] = useState(defaultSettings);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    code: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    timezone: 'America/Sao_Paulo',
    status: 'ATIVA',
    notes: '',
  });

  useEffect(() => {
    if (canReadSettings) {
      fetchSettings();
    }
  }, [canReadSettings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      const settings = response.data?.settings || defaultSettings;

      const normalized = {
        summary: settings.summary || defaultSettings.summary,
        company: { ...defaultSettings.company, ...(settings.company || {}) },
        units: Array.isArray(settings.units) ? settings.units : [],
        sections: {
          payroll: {
            ...defaultSettings.sections.payroll,
            ...(settings.sections?.payroll || {}),
          },
          time: {
            ...defaultSettings.sections.time,
            ...(settings.sections?.time || {}),
          },
          documents: {
            ...defaultSettings.sections.documents,
            ...(settings.sections?.documents || {}),
          },
          reports: {
            ...defaultSettings.sections.reports,
            ...(settings.sections?.reports || {}),
          },
          security: {
            ...defaultSettings.sections.security,
            ...(settings.sections?.security || {}),
          },
          notifications: {
            ...defaultSettings.sections.notifications,
            ...(settings.sections?.notifications || {}),
          },
          templates: {
            ...defaultSettings.sections.templates,
            ...(settings.sections?.templates || {}),
          },
          performance: {
            ...defaultSettings.sections.performance,
            ...(settings.sections?.performance || {}),
            weights: {
              ...defaultSettings.sections.performance.weights,
              ...(settings.sections?.performance?.weights || {}),
            },
          },
          system: {
            ...defaultSettings.sections.system,
            ...(settings.sections?.system || {}),
          },
        },
      };

      setSettingsData(normalized);
      setForms(normalized);
    } catch (error) {
      console.error('Erro ao carregar configuracoes:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEditSection = (section) => {
    if (!canUpdateSettings) return false;
    if (section === 'company' || section === 'units') return canManageCompany;
    if (section === 'payroll') return canManagePayroll;
    if (section === 'performance') return canManagePerformance;
    if (section === 'security') return canManageSecurity;
    if (section === 'notifications') return canManageNotifications;
    return true;
  };

  const handleCompanyChange = (event) => {
    const { name, value } = event.target;

    setForms((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [name]: value,
      },
    }));
  };

  const handleSectionChange = (section, event) => {
    const { name, value, type, checked } = event.target;

    setForms((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [name]: type === 'checkbox' ? checked : value,
        },
      },
    }));
  };

  const handleArrayChange = (section, field, rawValue) => {
    const nextValues = rawValue
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    setForms((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [field]: nextValues,
        },
      },
    }));
  };

  const handlePerformanceWeightChange = (event) => {
    const { name, value } = event.target;

    setForms((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        performance: {
          ...prev.sections.performance,
          weights: {
            ...prev.sections.performance.weights,
            [name]: value,
          },
        },
      },
    }));
  };

  const saveCompany = async () => {
    try {
      setSavingSection('company');
      const response = await api.put('/settings/company', forms.company);
      const nextCompany = response.data?.data || forms.company;

      setSettingsData((prev) => ({
        ...prev,
        company: nextCompany,
      }));

      setForms((prev) => ({
        ...prev,
        company: nextCompany,
      }));
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    } finally {
      setSavingSection('');
    }
  };

  const saveSection = async (section) => {
    try {
      setSavingSection(section);
      const response = await api.put(`/settings/sections/${section}`, forms.sections[section]);
      const nextSection = response.data?.data || forms.sections[section];

      setSettingsData((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [section]: nextSection,
        },
      }));

      setForms((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [section]: nextSection,
        },
      }));
    } catch (error) {
      console.error(`Erro ao salvar secao ${section}:`, error);
      alert(
        error?.response?.data?.message ||
          `Nao foi possivel salvar a secao ${section}.`
      );
    } finally {
      setSavingSection('');
    }
  };

  const openNewUnitDrawer = () => {
    setEditingUnitId(null);
    setUnitForm({
      name: '',
      code: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      timezone: forms.company.timezone || 'America/Sao_Paulo',
      status: 'ATIVA',
      notes: '',
    });
    setUnitDrawerOpen(true);
  };

  const openEditUnitDrawer = (unit) => {
    setEditingUnitId(unit.id);
    setUnitForm({
      name: unit.name || '',
      code: unit.code || '',
      cnpj: unit.cnpj || '',
      email: unit.email || '',
      phone: unit.phone || '',
      address: unit.address || '',
      city: unit.city || '',
      state: unit.state || '',
      zipCode: unit.zipCode || '',
      timezone: unit.timezone || 'America/Sao_Paulo',
      status: unit.status || 'ATIVA',
      notes: unit.notes || '',
    });
    setUnitDrawerOpen(true);
  };

  const closeUnitDrawer = () => {
    setUnitDrawerOpen(false);
    setEditingUnitId(null);
  };

  const handleUnitChange = (event) => {
    const { name, value } = event.target;
    setUnitForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveUnit = async () => {
    try {
      setSavingSection('units');
      let response;

      if (editingUnitId) {
        response = await api.put(`/settings/units/${editingUnitId}`, unitForm);
      } else {
        response = await api.post('/settings/units', unitForm);
      }

      const nextUnit = response.data?.unit;

      setSettingsData((prev) => {
        const nextUnits = editingUnitId
          ? prev.units.map((unit) => (unit.id === nextUnit.id ? nextUnit : unit))
          : [...prev.units, nextUnit];

        return {
          ...prev,
          units: nextUnits.sort((a, b) => a.name.localeCompare(b.name)),
          summary: {
            ...prev.summary,
            unitsCount: nextUnits.length,
            activeUnits: nextUnits.filter((unit) => unit.status === 'ATIVA').length,
          },
        };
      });

      setForms((prev) => ({
        ...prev,
        units: editingUnitId
          ? prev.units.map((unit) => (unit.id === nextUnit.id ? nextUnit : unit))
          : [...prev.units, nextUnit],
      }));

      closeUnitDrawer();
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
    } finally {
      setSavingSection('');
    }
  };

  const toggleUnitStatus = async (unit) => {
    try {
      setSavingSection(`unit-status-${unit.id}`);
      const nextStatus = unit.status === 'ATIVA' ? 'INATIVA' : 'ATIVA';
      const response = await api.patch(`/settings/units/${unit.id}/status`, {
        status: nextStatus,
      });
      const nextUnit = response.data?.unit;

      setSettingsData((prev) => {
        const nextUnits = prev.units.map((current) =>
          current.id === nextUnit.id ? nextUnit : current
        );

        return {
          ...prev,
          units: nextUnits,
          summary: {
            ...prev.summary,
            unitsCount: nextUnits.length,
            activeUnits: nextUnits.filter((current) => current.status === 'ATIVA')
              .length,
          },
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar status da unidade:', error);
    } finally {
      setSavingSection('');
    }
  };

  const overviewCards = [
    {
      title: 'Empresa base',
      value: settingsData.summary.companyName || 'EloSystem',
      subtitle: 'Base institucional ativa na operacao',
      tone: 'blue',
    },
    {
      title: 'Unidades ativas',
      value: settingsData.summary.activeUnits || 0,
      subtitle: `${settingsData.summary.unitsCount || 0} unidade(s) cadastrada(s)`,
      tone: 'green',
    },
    {
      title: 'Secoes configuradas',
      value: settingsData.summary.configuredSections || 0,
      subtitle: 'Blocos administrativos com parametros consolidados',
      tone: 'violet',
    },
    {
      title: 'Politica de seguranca',
      value: settingsData.summary.securityPolicy || 'Padrao',
      subtitle: 'Padrao de acesso e postura administrativa atual',
      tone: 'amber',
    },
    {
      title: 'Modo de relatorio',
      value: settingsData.summary.reportMode || 'EXCEL',
      subtitle: 'Formato executivo preferencial configurado',
      tone: 'slate',
    },
  ];

  const activeMeta = SECTION_META[activeSection];

  const cardsNavigation = SECTION_ORDER.map((section) => ({
    key: section,
    ...SECTION_META[section],
  }));

  const sectionContent = () => {
    if (activeSection === 'company') {
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <InputField
              label='Nome da empresa'
              name='name'
              value={forms.company.name}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='EloSystem'
            />
            <InputField
              label='Nome fantasia'
              name='tradeName'
              value={forms.company.tradeName}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='Nexo TI'
            />
            <InputField
              label='Razao social'
              name='legalName'
              value={forms.company.legalName}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='Razao social da empresa'
            />
            <InputField
              label='CNPJ'
              name='cnpj'
              value={forms.company.cnpj}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='00.000.000/0001-00'
            />
            <InputField
              label='E-mail principal'
              name='email'
              value={forms.company.email}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='contato@empresa.com'
            />
            <InputField
              label='Telefone'
              name='phone'
              value={forms.company.phone}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='(00) 00000-0000'
            />
            <InputField
              label='Endereco'
              name='address'
              value={forms.company.address}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='Rua, numero, complemento'
            />
            <InputField
              label='Cidade'
              name='city'
              value={forms.company.city}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='Cidade'
            />
            <InputField
              label='Estado'
              name='state'
              value={forms.company.state}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='UF'
            />
            <InputField
              label='CEP'
              name='zipCode'
              value={forms.company.zipCode}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='00000-000'
            />
            <InputField
              label='URL da logo'
              name='logoUrl'
              value={forms.company.logoUrl}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='https://...'
            />
            <InputField
              label='Cor primaria'
              name='primaryColor'
              value={forms.company.primaryColor}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              placeholder='#0f172a'
            />
            <SelectField
              label='Timezone'
              name='timezone'
              value={forms.company.timezone}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              options={[
                { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
                { value: 'America/Fortaleza', label: 'America/Fortaleza' },
                { value: 'America/Manaus', label: 'America/Manaus' },
              ]}
            />
            <SelectField
              label='Idioma'
              name='language'
              value={forms.company.language}
              onChange={handleCompanyChange}
              disabled={!canEditSection('company')}
              options={[
                { value: 'pt-BR', label: 'Portugues (Brasil)' },
                { value: 'en-US', label: 'English (US)' },
                { value: 'es-ES', label: 'Espanol' },
              ]}
            />
          </div>

          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={fetchSettings}
              className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
            >
              Recarregar dados
            </button>
            <button
              type='button'
              onClick={saveCompany}
              disabled={!canEditSection('company') || savingSection === 'company'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'company'
                ? 'Salvando empresa...'
                : 'Salvar empresa'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'units') {
      return (
        <div className='space-y-5'>
          <div className='flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div>
              <h4 className='text-lg font-semibold text-slate-900'>
                Estrutura de filiais e unidades
              </h4>
              <p className='mt-2 text-sm text-slate-500'>
                Base multiempresa pronta para vincular colaboradores, relatorios,
                jornada, folha e documentos por unidade.
              </p>
            </div>

            <button
              type='button'
              onClick={openNewUnitDrawer}
              disabled={!canEditSection('units')}
              className='rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              + Nova unidade
            </button>
          </div>

          <div className='space-y-4'>
            {settingsData.units.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500'>
                Nenhuma unidade cadastrada ainda. Esta area ja esta pronta para
                suportar multiempresa e filiais do EloSystem.
              </div>
            ) : (
              settingsData.units.map((unit) => (
                <div
                  key={unit.id}
                  className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-3'>
                        <h4 className='text-xl font-semibold text-slate-900'>
                          {unit.name}
                        </h4>
                        <UnitStatusBadge status={unit.status} />
                        {unit.code ? (
                          <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'>
                            Codigo: {unit.code}
                          </span>
                        ) : null}
                      </div>
                      <p className='mt-3 text-sm text-slate-500'>
                        {[
                          unit.cnpj,
                          unit.email,
                          unit.phone,
                          unit.city,
                          unit.state,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Dados complementares ainda em evolucao'}
                      </p>
                      {unit.address ? (
                        <p className='mt-2 text-sm text-slate-500'>
                          {unit.address}
                        </p>
                      ) : null}
                    </div>

                    <div className='flex flex-wrap items-center gap-3'>
                      <button
                        type='button'
                        onClick={() => openEditUnitDrawer(unit)}
                        disabled={!canEditSection('units')}
                        className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Editar
                      </button>
                      <button
                        type='button'
                        onClick={() => toggleUnitStatus(unit)}
                        disabled={
                          !canEditSection('units') ||
                          savingSection === `unit-status-${unit.id}`
                        }
                        className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {savingSection === `unit-status-${unit.id}`
                          ? 'Atualizando...'
                          : unit.status === 'ATIVA'
                          ? 'Inativar'
                          : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeSection === 'payroll') {
      const data = forms.sections.payroll;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <InputField
              label='Dia padrao de fechamento'
              name='closingDay'
              type='number'
              value={data.closingDay}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
            />
            <InputField
              label='Dia padrao de pagamento'
              name='paymentDay'
              type='number'
              value={data.paymentDay}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
            />
            <InputField
              label='Tolerancia de atraso (min)'
              name='delayToleranceMinutes'
              type='number'
              value={data.delayToleranceMinutes}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
            />
            <SelectField
              label='Regra padrao de banco de horas'
              name='bankHoursRule'
              value={data.bankHoursRule}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
              options={[
                { value: 'COMPENSACAO_MENSAL', label: 'Compensacao mensal' },
                { value: 'SALDO_ACUMULADO', label: 'Saldo acumulado' },
                { value: 'NAO_APLICA', label: 'Nao aplica' },
              ]}
            />
            <InputField
              label='Hora extra 50%'
              name='overtimePercent50'
              type='number'
              value={data.overtimePercent50}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
            />
            <InputField
              label='Hora extra 100%'
              name='overtimePercent100'
              type='number'
              value={data.overtimePercent100}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
            />
            <SelectField
              label='Janela padrao de competencia'
              name='defaultCompetenceWindow'
              value={data.defaultCompetenceWindow}
              onChange={(event) => handleSectionChange('payroll', event)}
              disabled={!canEditSection('payroll')}
              options={[
                { value: 'MENSAL', label: 'Mensal' },
                { value: 'QUINZENAL', label: 'Quinzenal' },
                { value: 'PERSONALIZADA', label: 'Personalizada' },
              ]}
            />
          </div>

          <ToggleField
            label='Permitir reabertura de competencia'
            description='Mantem flexibilidade operacional para ajustes controlados apos o fechamento.'
            name='allowReopen'
            checked={data.allowReopen}
            onChange={(event) => handleSectionChange('payroll', event)}
            disabled={!canEditSection('payroll')}
          />

          <InputField
            label='Observacoes padrao'
            name='defaultNotes'
            value={data.defaultNotes}
            onChange={(event) => handleSectionChange('payroll', event)}
            disabled={!canEditSection('payroll')}
            as='textarea'
            rows={4}
            placeholder='Padrao de observacoes para o fechamento da folha'
          />

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('payroll')}
              disabled={!canEditSection('payroll') || savingSection === 'payroll'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'payroll'
                ? 'Salvando parametros...'
                : 'Salvar configuracoes da folha'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'time') {
      const data = forms.sections.time;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <SelectField
              label='Layout padrao de importacao'
              name='importLayout'
              value={data.importLayout}
              onChange={(event) => handleSectionChange('time', event)}
              disabled={!canEditSection('time')}
              options={[
                { value: 'AUTO', label: 'Deteccao automatica' },
                { value: 'TOTVS', label: 'TOTVS / MyAhgora' },
                { value: 'CSV', label: 'CSV customizado' },
              ]}
            />
            <InputField
              label='Jornada padrao (horas)'
              name='standardJourneyHours'
              type='number'
              value={data.standardJourneyHours}
              onChange={(event) => handleSectionChange('time', event)}
              disabled={!canEditSection('time')}
            />
            <InputField
              label='Tolerancia de atraso (min)'
              name='delayToleranceMinutes'
              type='number'
              value={data.delayToleranceMinutes}
              onChange={(event) => handleSectionChange('time', event)}
              disabled={!canEditSection('time')}
            />
            <SelectField
              label='Modo de importacao'
              name='importMode'
              value={data.importMode}
              onChange={(event) => handleSectionChange('time', event)}
              disabled={!canEditSection('time')}
              options={[
                { value: 'PREVIEW_OBRIGATORIA', label: 'Preview obrigatoria' },
                { value: 'IMPORTACAO_DIRETA', label: 'Importacao direta' },
                { value: 'REVISAO_MANUAL', label: 'Revisao manual' },
              ]}
            />
            <SelectField
              label='Politica de duplicidade'
              name='duplicatePolicy'
              value={data.duplicatePolicy}
              onChange={(event) => handleSectionChange('time', event)}
              disabled={!canEditSection('time')}
              options={[
                { value: 'BLOQUEAR', label: 'Bloquear duplicidade' },
                { value: 'SINALIZAR', label: 'Sinalizar para revisao' },
                { value: 'SUBSTITUIR', label: 'Substituir importacao anterior' },
              ]}
            />
          </div>

          <ToggleField
            label='Banco de horas habilitado'
            description='Permite consolidar o saldo da jornada e apoiar futuras integracoes com a folha.'
            name='bankHoursEnabled'
            checked={data.bankHoursEnabled}
            onChange={(event) => handleSectionChange('time', event)}
            disabled={!canEditSection('time')}
          />

          <label className='block text-sm font-semibold text-slate-700'>
            Ordem de reconhecimento do colaborador
            <textarea
              value={(data.employeeRecognitionOrder || []).join('\n')}
              onChange={(event) =>
                handleArrayChange('time', 'employeeRecognitionOrder', event.target.value)
              }
              rows={4}
              disabled={!canEditSection('time')}
              className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
            />
          </label>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('time')}
              disabled={!canEditSection('time') || savingSection === 'time'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'time'
                ? 'Salvando jornada...'
                : 'Salvar configuracoes da jornada'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'documents') {
      const data = forms.sections.documents;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <InputField
              label='Validade padrao (dias)'
              name='defaultValidityDays'
              type='number'
              value={data.defaultValidityDays}
              onChange={(event) => handleSectionChange('documents', event)}
              disabled={!canEditSection('documents')}
            />
            <InputField
              label='Alerta antes do vencimento (dias)'
              name='alertDaysBeforeExpiry'
              type='number'
              value={data.alertDaysBeforeExpiry}
              onChange={(event) => handleSectionChange('documents', event)}
              disabled={!canEditSection('documents')}
            />
            <SelectField
              label='Status padrao'
              name='defaultStatus'
              value={data.defaultStatus}
              onChange={(event) => handleSectionChange('documents', event)}
              disabled={!canEditSection('documents')}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'PENDENTE', label: 'Pendente' },
                { value: 'REVISAO', label: 'Em revisao' },
              ]}
            />
          </div>

          <ToggleField
            label='Alertas automaticos de documentos'
            description='Dispara regras de monitoramento para vencimento e pendencias documentais.'
            name='automaticAlerts'
            checked={data.automaticAlerts}
            onChange={(event) => handleSectionChange('documents', event)}
            disabled={!canEditSection('documents')}
          />

          <label className='block text-sm font-semibold text-slate-700'>
            Categorias padrao
            <textarea
              value={(data.categories || []).join('\n')}
              onChange={(event) =>
                handleArrayChange('documents', 'categories', event.target.value)
              }
              rows={5}
              disabled={!canEditSection('documents')}
              className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
            />
          </label>

          <label className='block text-sm font-semibold text-slate-700'>
            Contextos obrigatorios
            <textarea
              value={(data.requiredContexts || []).join('\n')}
              onChange={(event) =>
                handleArrayChange('documents', 'requiredContexts', event.target.value)
              }
              rows={4}
              disabled={!canEditSection('documents')}
              className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
            />
          </label>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('documents')}
              disabled={!canEditSection('documents') || savingSection === 'documents'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'documents'
                ? 'Salvando documentos...'
                : 'Salvar configuracoes de documentos'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'reports') {
      const data = forms.sections.reports;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <InputField
              label='Titulo do cabecalho'
              name='headerTitle'
              value={data.headerTitle}
              onChange={(event) => handleSectionChange('reports', event)}
              disabled={!canEditSection('reports')}
            />
            <InputField
              label='Rotulo de assinatura'
              name='signatureLabel'
              value={data.signatureLabel}
              onChange={(event) => handleSectionChange('reports', event)}
              disabled={!canEditSection('reports')}
            />
            <SelectField
              label='Formato preferencial'
              name='preferredFormat'
              value={data.preferredFormat}
              onChange={(event) => handleSectionChange('reports', event)}
              disabled={!canEditSection('reports')}
              options={[
                { value: 'EXCEL', label: 'Excel' },
                { value: 'PDF', label: 'PDF' },
                { value: 'AMBOS', label: 'Ambos' },
              ]}
            />
          </div>

          <InputField
            label='Rodape padrao'
            name='footerText'
            value={data.footerText}
            onChange={(event) => handleSectionChange('reports', event)}
            disabled={!canEditSection('reports')}
            as='textarea'
            rows={4}
          />

          <div className='grid gap-4 md:grid-cols-2'>
            <ToggleField
              label='Exibir branding institucional'
              description='Mantem nome e identidade da empresa nos relatorios exportados.'
              name='includeCompanyBranding'
              checked={data.includeCompanyBranding}
              onChange={(event) => handleSectionChange('reports', event)}
              disabled={!canEditSection('reports')}
            />
            <ToggleField
              label='Exibir data de geracao'
              description='Inclui data e hora de emissao nas saidas executivas do sistema.'
              name='includeGeneratedAt'
              checked={data.includeGeneratedAt}
              onChange={(event) => handleSectionChange('reports', event)}
              disabled={!canEditSection('reports')}
            />
          </div>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('reports')}
              disabled={!canEditSection('reports') || savingSection === 'reports'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'reports'
                ? 'Salvando relatorios...'
                : 'Salvar configuracoes de relatorios'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'security') {
      const data = forms.sections.security;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <InputField
              label='Tamanho minimo da senha'
              name='passwordMinLength'
              type='number'
              value={data.passwordMinLength}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <InputField
              label='Timeout de sessao (min)'
              name='sessionTimeoutMinutes'
              type='number'
              value={data.sessionTimeoutMinutes}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <InputField
              label='Expiracao absoluta da sessao (h)'
              name='absoluteSessionHours'
              type='number'
              value={data.absoluteSessionHours}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <InputField
              label='Tentativas maximas de login'
              name='maxLoginAttempts'
              type='number'
              value={data.maxLoginAttempts}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <InputField
              label='Bloqueio temporario (min)'
              name='loginLockMinutes'
              type='number'
              value={data.loginLockMinutes}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <InputField
              label='Janela de reautenticacao (min)'
              name='reauthWindowMinutes'
              type='number'
              value={data.reauthWindowMinutes}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <SelectField
              label='Nivel de auditoria de login'
              name='loginAuditLevel'
              value={data.loginAuditLevel}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
              options={[
                { value: 'BASICO', label: 'Basico' },
                { value: 'PADRAO', label: 'Padrao' },
                { value: 'AVANCADO', label: 'Avancado' },
              ]}
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <ToggleField
              label='Obrigar troca de senha'
              description='Solicita renovacao de senha em cenarios administrativos sensiveis.'
              name='forcePasswordChange'
              checked={data.forcePasswordChange}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <ToggleField
              label='Base pronta para MFA'
              description='Mantem a configuracao preparada para fator adicional de autenticacao.'
              name='enableMfaReady'
              checked={data.enableMfaReady}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <ToggleField
              label='MFA obrigatorio para perfis criticos'
              description='Super Admin, Admin e perfis executivos ficam protegidos por validacao adicional.'
              name='mfaRequiredForPrivileged'
              checked={data.mfaRequiredForPrivileged}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <ToggleField
              label='Permitir MFA opcional para RH'
              description='Mantem adesao progressiva para operacao do RH sem travar a primeira fase.'
              name='mfaOptionalForRh'
              checked={data.mfaOptionalForRh}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <ToggleField
              label='Bloquear usuarios inativos'
              description='Impede acesso de usuarios inativos ou bloqueados no sistema.'
              name='blockInactiveUsers'
              checked={data.blockInactiveUsers}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
            <ToggleField
              label='Bloquear senhas muito comuns'
              description='Evita senhas previsiveis e reduz risco de brute force bem-sucedido.'
              name='blockCommonPasswords'
              checked={data.blockCommonPasswords}
              onChange={(event) => handleSectionChange('security', event)}
              disabled={!canEditSection('security')}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
            <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
              <p className='text-sm font-semibold text-slate-900'>
                Postura de seguranca aplicada na autenticacao
              </p>
              <div className='mt-4 grid gap-3 md:grid-cols-2'>
                {[
                  'O backend controla MFA, brute force, expiracao de sessao e reautenticacao.',
                  'Perfis criticos podem ser obrigados a validar um codigo por e-mail antes de concluir o login.',
                  'Falhas repetidas geram bloqueio temporario sem vazar se o e-mail existe ou nao.',
                  'Acoes sensiveis ficam preparadas para exigir reautenticacao recente no backend.',
                ].map((item) => (
                  <div
                    key={item}
                    className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600'
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
              <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
                Resumo da politica
              </p>
              <div className='mt-4 space-y-3 text-sm leading-6 text-slate-600'>
                <p>
                  Senha minima: <strong>{data.passwordMinLength} caracteres</strong>
                </p>
                <p>
                  Sessao por inatividade: <strong>{data.sessionTimeoutMinutes} min</strong>
                </p>
                <p>
                  Bloqueio apos falhas: <strong>{data.maxLoginAttempts} tentativas</strong>
                </p>
                <p>
                  Cooldown temporario: <strong>{data.loginLockMinutes} min</strong>
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('security')}
              disabled={!canEditSection('security') || savingSection === 'security'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'security'
                ? 'Salvando seguranca...'
                : 'Salvar configuracoes de seguranca'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'notifications') {
      const data = forms.sections.notifications;
      return (
        <div className='space-y-5'>
          <div className='grid gap-4 md:grid-cols-2'>
            <ToggleField
              label='Alertar documentos vencendo'
              description='Aciona alertas para documentos com vencimento proximo.'
              name='notifyExpiringDocuments'
              checked={data.notifyExpiringDocuments}
              onChange={(event) => handleSectionChange('notifications', event)}
              disabled={!canEditSection('notifications')}
            />
            <ToggleField
              label='Alertar pendencias criticas'
              description='Dispara leitura prioritaria para itens que exigem acao imediata.'
              name='notifyCriticalPendingItems'
              checked={data.notifyCriticalPendingItems}
              onChange={(event) => handleSectionChange('notifications', event)}
              disabled={!canEditSection('notifications')}
            />
            <ToggleField
              label='Alertar eventos de folha'
              description='Reserva trilha para fechamento, reabertura e consolidacoes da folha.'
              name='notifyPayrollEvents'
              checked={data.notifyPayrollEvents}
              onChange={(event) => handleSectionChange('notifications', event)}
              disabled={!canEditSection('notifications')}
            />
            <ToggleField
              label='Notificacao por e-mail'
              description='Permite uso de canais de e-mail corporativo nas automacoes do EloSystem.'
              name='notifyByEmail'
              checked={data.notifyByEmail}
              onChange={(event) => handleSectionChange('notifications', event)}
              disabled={!canEditSection('notifications')}
            />
            <ToggleField
              label='Notificacao interna'
              description='Mantem os avisos visiveis dentro da experiencia do sistema.'
              name='notifyInApp'
              checked={data.notifyInApp}
              onChange={(event) => handleSectionChange('notifications', event)}
              disabled={!canEditSection('notifications')}
            />
          </div>

          <SelectField
            label='Frequencia do resumo'
            name='digestFrequency'
            value={data.digestFrequency}
            onChange={(event) => handleSectionChange('notifications', event)}
            disabled={!canEditSection('notifications')}
            options={[
              { value: 'IMEDIATO', label: 'Imediato' },
              { value: 'DIARIO', label: 'Diario' },
              { value: 'SEMANAL', label: 'Semanal' },
            ]}
          />

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('notifications')}
              disabled={
                !canEditSection('notifications') ||
                savingSection === 'notifications'
              }
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'notifications'
                ? 'Salvando notificacoes...'
                : 'Salvar configuracoes de notificacao'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'templates') {
      const data = forms.sections.templates;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2'>
            <InputField
              label='Template de advertencia'
              name='warningTemplate'
              value={data.warningTemplate}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
              as='textarea'
              rows={4}
            />
            <InputField
              label='Template de suspensao'
              name='suspensionTemplate'
              value={data.suspensionTemplate}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
              as='textarea'
              rows={4}
            />
            <InputField
              label='Template de onboarding'
              name='onboardingTemplate'
              value={data.onboardingTemplate}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
              as='textarea'
              rows={4}
            />
            <InputField
              label='Template de documento RH'
              name='hrDocumentTemplate'
              value={data.hrDocumentTemplate}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
              as='textarea'
              rows={4}
            />
            <InputField
              label='Cabecalho padrao'
              name='defaultHeader'
              value={data.defaultHeader}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
            />
            <InputField
              label='Rodape padrao'
              name='defaultFooter'
              value={data.defaultFooter}
              onChange={(event) => handleSectionChange('templates', event)}
              disabled={!canEditSection('templates')}
              as='textarea'
              rows={4}
            />
          </div>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('templates')}
              disabled={!canEditSection('templates') || savingSection === 'templates'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'templates'
                ? 'Salvando templates...'
                : 'Salvar templates'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'performance') {
      const data = forms.sections.performance;
      const totalWeights = Object.values(data.weights || {}).reduce(
        (acc, value) => acc + Number(value || 0),
        0
      );
      const normalizedTotal = Math.round(totalWeights * 100) / 100;
      const isValidTotal = normalizedTotal === 100;

      return (
        <div className='space-y-6'>
          <div className='rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='max-w-3xl'>
                <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700'>
                  Motor de avaliacao centralizado
                </p>
                <h4 className='mt-2 text-2xl font-bold text-slate-900'>
                  Pesos oficiais do calculo de desempenho
                </h4>
                <p className='mt-3 text-sm leading-6 text-slate-600'>
                  Ajuste a composicao da nota final sem mover nenhuma regra para
                  o frontend. O EloSystem continua calculando o score no backend,
                  com auditoria, validacao de soma e fallback seguro para os
                  pesos padrao sempre que necessario.
                </p>
              </div>

              <div
                className={`min-w-[220px] rounded-3xl border px-5 py-4 shadow-sm ${
                  isValidTotal
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <p className='text-xs font-semibold uppercase tracking-[0.24em] opacity-80'>
                  Soma atual
                </p>
                <p className='mt-2 text-3xl font-bold'>{normalizedTotal}%</p>
                <p className='mt-2 text-sm opacity-80'>
                  {isValidTotal
                    ? 'Configuracao valida para salvar e aplicar no backend.'
                    : 'A distribuicao precisa fechar exatamente em 100%.'}
                </p>
              </div>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            <PerformanceWeightField
              label='Pontualidade'
              name='punctuality'
              value={data.weights?.punctuality}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Assiduidade'
              name='attendance'
              value={data.weights?.attendance}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Eficiencia'
              name='efficiency'
              value={data.weights?.efficiency}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Comportamento / postura'
              name='behavior'
              value={data.weights?.behavior}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Feedback interno'
              name='peerFeedback'
              value={data.weights?.peerFeedback}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Feedback externo'
              name='externalFeedback'
              value={data.weights?.externalFeedback}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
            <PerformanceWeightField
              label='Treinamentos'
              name='trainings'
              value={data.weights?.trainings}
              onChange={handlePerformanceWeightChange}
              disabled={!canEditSection('performance')}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-[1.25fr_0.75fr]'>
            <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
              <p className='text-sm font-semibold text-slate-900'>
                Como essa configuracao entra na nota final
              </p>
              <div className='mt-4 grid gap-3 md:grid-cols-2'>
                {[
                  'Pontualidade e assiduidade usam dados automaticos da Jornada.',
                  'Eficiencia e comportamento consolidam a avaliacao manual da gestora.',
                  'Feedback interno e externo entram como componentes distintos da media.',
                  'Treinamentos reforcam desenvolvimento, aderencia e evolucao do colaborador.',
                ].map((item) => (
                  <div
                    key={item}
                    className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600'
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
              <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
                Governanca da configuracao
              </p>
              <div className='mt-4 space-y-3 text-sm leading-6 text-slate-600'>
                <p>
                  O backend bloqueia qualquer tentativa de salvar pesos fora do
                  intervalo permitido ou com soma diferente de 100%.
                </p>
                <p>
                  Alteracoes ficam auditadas com antes, depois e usuario
                  responsavel para preservar rastreabilidade administrativa.
                </p>
                <p>
                  Se nenhuma configuracao existir, o EloSystem continua operando
                  com os pesos padrao oficiais da fase 1.
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('performance')}
              disabled={
                !canEditSection('performance') ||
                savingSection === 'performance' ||
                !isValidTotal
              }
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'performance'
                ? 'Salvando pesos de desempenho...'
                : 'Salvar configuracoes de desempenho'}
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === 'system') {
      const data = forms.sections.system;
      return (
        <div className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            <SelectField
              label='Idioma do sistema'
              name='language'
              value={data.language}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
              options={[
                { value: 'pt-BR', label: 'Portugues (Brasil)' },
                { value: 'en-US', label: 'English (US)' },
                { value: 'es-ES', label: 'Espanol' },
              ]}
            />
            <SelectField
              label='Formato de data'
              name='dateFormat'
              value={data.dateFormat}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
            <SelectField
              label='Timezone do sistema'
              name='timezone'
              value={data.timezone}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
              options={[
                { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
                { value: 'America/Fortaleza', label: 'America/Fortaleza' },
                { value: 'America/Manaus', label: 'America/Manaus' },
              ]}
            />
            <InputField
              label='Nome institucional do sistema'
              name='systemLabel'
              value={data.systemLabel}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <ToggleField
              label='Modo compacto futuro'
              description='Reserva a experiencia para visualizacoes mais densas e operacionais.'
              name='compactMode'
              checked={data.compactMode}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
            />
            <ToggleField
              label='Preferir dashboard executivo'
              description='Mantem leitura estrategica como experiencia inicial do produto.'
              name='preferExecutiveDashboard'
              checked={data.preferExecutiveDashboard}
              onChange={(event) => handleSectionChange('system', event)}
              disabled={!canEditSection('system')}
            />
          </div>

          <div className='flex items-center justify-end'>
            <button
              type='button'
              onClick={() => saveSection('system')}
              disabled={!canEditSection('system') || savingSection === 'system'}
              className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {savingSection === 'system'
                ? 'Salvando sistema...'
                : 'Salvar preferencias do sistema'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
        <p className='text-sm text-slate-500'>
          Esta secao esta pronta para evolucao e pode ser administrada pelo hub
          central de configuracoes.
        </p>
      </div>
    );
  };

  if (!canReadSettings) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm'>
        <h2 className='text-xl font-bold'>Acesso restrito</h2>
        <p className='mt-2 text-sm'>
          Seu perfil ainda nao possui permissao para visualizar a area de
          configuracoes do EloSystem.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <section className='overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm'>
          <div className='bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-8 py-10 text-white'>
            <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
              <div className='max-w-4xl'>
                <div className='mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-100'>
                  Painel mestre enterprise
                </div>
                <h2 className='text-4xl font-bold tracking-tight'>
                  Configuracoes
                </h2>
                <p className='mt-4 max-w-3xl text-base text-slate-200'>
                  Concentre parametros institucionais, unidades, folha,
                  jornada, seguranca, relatorios e governanca do EloSystem em
                  uma base administrativa pronta para crescimento real.
                </p>
              </div>

              <div className='rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm'>
                <p className='text-xs uppercase tracking-[0.24em] text-indigo-100'>
                  Postura atual
                </p>
                <p className='mt-3 text-3xl font-bold'>
                  {settingsData.summary.configuredSections || 0}
                </p>
                <p className='mt-2 text-sm text-slate-200'>
                  secoes ja consolidadas para operacao administrativa
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          {overviewCards.map((card) => (
            <OverviewCard key={card.title} {...card} />
          ))}
        </section>

        <section className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='mb-6'>
              <h3 className='text-2xl font-bold text-slate-900'>
                Hub administrativo
              </h3>
              <p className='mt-2 text-sm text-slate-500'>
                Escolha a camada que deseja administrar e evolua os parametros
                do sistema por categoria, com governanca e rastreabilidade.
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              {cardsNavigation.map((section) => (
                <button
                  key={section.key}
                  type='button'
                  onClick={() => setActiveSection(section.key)}
                  className={`overflow-hidden rounded-3xl border text-left shadow-sm transition ${
                    activeSection === section.key
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`bg-gradient-to-r ${section.accent} px-5 py-5 text-white`}>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <p className='text-[11px] uppercase tracking-[0.26em] text-white/75'>
                          {section.eyebrow}
                        </p>
                        <h4 className='mt-2 text-xl font-semibold'>
                          {section.title}
                        </h4>
                      </div>

                      <span className='rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white'>
                        {section.badge}
                      </span>
                    </div>
                  </div>

                  <div className='bg-white px-5 py-5'>
                    <p className='text-sm leading-6 text-slate-500'>
                      {section.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className={`rounded-[28px] bg-gradient-to-r ${activeMeta.accent} px-6 py-6 text-white`}>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                <div className='max-w-2xl'>
                  <p className='text-[11px] uppercase tracking-[0.28em] text-white/75'>
                    {activeMeta.eyebrow}
                  </p>
                  <h3 className='mt-2 text-3xl font-bold'>{activeMeta.title}</h3>
                  <p className='mt-3 text-sm text-slate-200'>
                    {activeMeta.description}
                  </p>
                </div>

                <span className='inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white'>
                  {activeMeta.badge}
                </span>
              </div>
            </div>

            <div className='mt-6'>
              {loading ? (
                <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500'>
                  Carregando centro de configuracoes...
                </div>
              ) : (
                sectionContent()
              )}
            </div>
          </div>
        </section>
      </div>

      {unitDrawerOpen ? (
        <div className='fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm'>
          <div className='h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl'>
            <div className='border-b border-slate-200 px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
                    Estrutura multiempresa
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-slate-900'>
                    {editingUnitId ? 'Editar unidade' : 'Nova unidade'}
                  </h3>
                  <p className='mt-2 text-sm text-slate-500'>
                    Cadastre unidades, filiais e estruturas futuras para
                    vincular pessoas, folha, jornada, relatorios e documentos.
                  </p>
                </div>

                <button
                  type='button'
                  onClick={closeUnitDrawer}
                  className='rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className='space-y-5 px-6 py-6'>
              <div className='grid gap-5 md:grid-cols-2'>
                <InputField
                  label='Nome da unidade'
                  name='name'
                  value={unitForm.name}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='Codigo interno'
                  name='code'
                  value={unitForm.code}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='CNPJ'
                  name='cnpj'
                  value={unitForm.cnpj}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='E-mail'
                  name='email'
                  value={unitForm.email}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='Telefone'
                  name='phone'
                  value={unitForm.phone}
                  onChange={handleUnitChange}
                />
                <SelectField
                  label='Status'
                  name='status'
                  value={unitForm.status}
                  onChange={handleUnitChange}
                  options={[
                    { value: 'ATIVA', label: 'Ativa' },
                    { value: 'INATIVA', label: 'Inativa' },
                  ]}
                />
                <InputField
                  label='Endereco'
                  name='address'
                  value={unitForm.address}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='Cidade'
                  name='city'
                  value={unitForm.city}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='Estado'
                  name='state'
                  value={unitForm.state}
                  onChange={handleUnitChange}
                />
                <InputField
                  label='CEP'
                  name='zipCode'
                  value={unitForm.zipCode}
                  onChange={handleUnitChange}
                />
                <SelectField
                  label='Timezone'
                  name='timezone'
                  value={unitForm.timezone}
                  onChange={handleUnitChange}
                  options={[
                    { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
                    { value: 'America/Fortaleza', label: 'America/Fortaleza' },
                    { value: 'America/Manaus', label: 'America/Manaus' },
                  ]}
                />
              </div>

              <InputField
                label='Observacoes'
                name='notes'
                value={unitForm.notes}
                onChange={handleUnitChange}
                as='textarea'
                rows={4}
              />
            </div>

            <div className='sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4'>
              <div className='flex items-center justify-end gap-3'>
                <button
                  type='button'
                  onClick={closeUnitDrawer}
                  className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Cancelar
                </button>
                <button
                  type='button'
                  onClick={saveUnit}
                  disabled={savingSection === 'units'}
                  className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {savingSection === 'units'
                    ? 'Salvando unidade...'
                    : editingUnitId
                    ? 'Salvar unidade'
                    : 'Cadastrar unidade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SettingsPage;
