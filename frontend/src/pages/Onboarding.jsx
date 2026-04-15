import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  employeeName: '',
  status: 'PENDENTE',
  welcomeSent: false,
  accessCreated: false,
  startDate: '',
  completedAt: '',
  notes: '',
};

const REQUIRED_DOCUMENT_CATEGORIES = [
  'RG',
  'CPF',
  'Comprovante de Residência',
  'Carteira de Trabalho',
  'Dados Bancários',
  'ASO',
  'Contrato',
];

const statusConfig = {
  PENDENTE: {
    label: 'Pendente',
    card: 'border-amber-200 bg-amber-50 text-amber-700',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  EM_ANDAMENTO: {
    label: 'Em andamento',
    card: 'border-blue-200 bg-blue-50 text-blue-700',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
  },
  CONCLUIDO: {
    label: 'Concluído',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const normalizeEmployeeName = (employee) =>
  employee?.name || employee?.fullName || 'Colaborador';

const normalizeDocuments = (items) =>
  (items || []).map((item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    category: item.category || '',
    title: item.title || '',
    status: (item.status || '').toUpperCase(),
  }));

const normalizeUniforms = (items) =>
  (items || []).map((item) => ({
    id: item.id,
    employeeId: item.employeeId || item.employee?.id || null,
    quantity: item.quantity || 0,
    deliveryDate: item.deliveryDate || '',
    employee: item.employee || null,
  }));

const normalizeBenefits = (items) =>
  (items || []).map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    healthPlan: Boolean(item.healthPlan),
    dentalPlan: Boolean(item.dentalPlan),
    mealVoucher: Boolean(item.mealVoucher),
    transportVoucher: Boolean(item.transportVoucher),
  }));

const normalizeOnboarding = (item) => ({
  id: item.id,
  employeeId: Number(item.employeeId),
  employeeName: normalizeEmployeeName(item.employee) || item.employeeName || '',
  status: item.status || 'PENDENTE',
  welcomeSent: Boolean(item.welcomeSent),
  accessCreated: Boolean(item.accessCreated),
  startDate: item.startDate || '',
  completedAt: item.completedAt || '',
  notes: item.notes || '',
  createdAt: item.createdAt || '',
  updatedAt: item.updatedAt || '',
});

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('pt-BR');
};

const StepBadge = ({ active, label }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border border-slate-200 bg-slate-100 text-slate-600'
    }`}
  >
    {label}
  </span>
);

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const current = statusConfig[status] || statusConfig.PENDENTE;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.badge}`}
    >
      {current.label}
    </span>
  );
};

const Onboarding = () => {
  const [employees, setEmployees] = useState([]);
  const [onboardings, setOnboardings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uniforms, setUniforms] = useState([]);
  const [benefits, setBenefits] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingOnboardings, setLoadingOnboardings] = useState(true);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCard, setSelectedCard] = useState(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([
      fetchEmployees(),
      fetchOnboardings(),
      fetchDocuments(),
      fetchUniforms(),
      fetchBenefits(),
    ]);
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || res.data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchOnboardings = async () => {
    try {
      setLoadingOnboardings(true);
      const res = await api.get('/onboarding');
      const raw = res.data?.onboardings || [];
      setOnboardings(raw.map(normalizeOnboarding));
    } catch (error) {
      console.error('Erro ao buscar onboardings:', error);
      setOnboardings([]);
    } finally {
      setLoadingOnboardings(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingExtras(true);
      const res = await api.get('/documents');
      setDocuments(normalizeDocuments(res.data?.documents || []));
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      setDocuments([]);
    } finally {
      setLoadingExtras(false);
    }
  };

  const fetchUniforms = async () => {
    try {
      const res = await api.get('/uniforms');
      setUniforms(
        normalizeUniforms(
          res.data?.uniforms ||
            res.data?.uniformControls ||
            res.data?.deliveries ||
            []
        )
      );
    } catch (error) {
      console.error('Erro ao buscar fardamento:', error);
      setUniforms([]);
    }
  };

  const fetchBenefits = async () => {
    try {
      const res = await api.get('/benefits');
      setBenefits(normalizeBenefits(res.data?.benefits || []));
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
      setBenefits([]);
    }
  };

  const openDrawer = (item = null) => {
    if (item) {
      setFormData({
        employeeId: String(item.employeeId),
        employeeName: item.employeeName || '',
        status: item.status || 'PENDENTE',
        welcomeSent: Boolean(item.welcomeSent),
        accessCreated: Boolean(item.accessCreated),
        startDate: item.startDate ? item.startDate.slice(0, 10) : '',
        completedAt: item.completedAt ? item.completedAt.slice(0, 10) : '',
        notes: item.notes || '',
      });
      setSelectedCard(item);
    } else {
      setFormData(initialForm);
      setSelectedCard(null);
    }

    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setFormData(initialForm);
    setSelectedCard(null);
    setIsDrawerOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'employeeId') {
      const emp = employees.find((employee) => String(employee.id) === value);

      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        employeeName: emp?.fullName || emp?.name || '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.employeeName) {
      alert('Selecione o colaborador.');
      return;
    }

    const payload = {
      employeeId: Number(formData.employeeId),
      status: formData.status,
      welcomeSent: formData.welcomeSent,
      accessCreated: formData.accessCreated,
      startDate: formData.startDate || undefined,
      completedAt: formData.completedAt || null,
      notes: formData.notes,
    };

    try {
      setSaving(true);

      const existing = onboardings.find(
        (item) => Number(item.employeeId) === Number(formData.employeeId)
      );

      if (existing) {
        await api.put(`/onboarding/${existing.id}`, payload);
      } else {
        await api.post('/onboarding', payload);
      }

      await fetchOnboardings();
      closeDrawer();
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar onboarding.');
    } finally {
      setSaving(false);
    }
  };

  const onboardingCards = useMemo(() => {
    return onboardings.map((item) => {
      const employeeDocuments = documents.filter(
        (doc) => Number(doc.employeeId) === Number(item.employeeId)
      );

      const deliveredCategories = new Set(
        employeeDocuments
          .filter(
            (doc) =>
              ![
                'PENDENTE',
                'PENDENTE_ENVIO',
                'PENDENTE_VALIDACAO',
                'PENDENTE_VALIDADOR',
              ].includes((doc.status || '').toUpperCase())
          )
          .map((doc) => doc.category || doc.title)
      );

      const pendingDocuments = REQUIRED_DOCUMENT_CATEGORIES.filter(
        (required) => !deliveredCategories.has(required)
      );

      const employeeUniforms = uniforms.filter(
        (uniform) => Number(uniform.employeeId) === Number(item.employeeId)
      );

      const hasUniformDelivery = employeeUniforms.some(
        (uniform) =>
          Boolean(uniform.deliveryDate) || Number(uniform.quantity) > 0
      );

      const employeeBenefit = benefits.find(
        (benefit) => Number(benefit.employeeId) === Number(item.employeeId)
      );

      const benefitsConfigured = Boolean(employeeBenefit);

      const progressSteps = [
        item.welcomeSent,
        item.accessCreated,
        pendingDocuments.length === 0,
        hasUniformDelivery,
        benefitsConfigured,
      ];

      const completedSteps = progressSteps.filter(Boolean).length;
      const progress = Math.round(
        (completedSteps / progressSteps.length) * 100
      );

      return {
        ...item,
        pendingDocuments,
        pendingDocumentsCount: pendingDocuments.length,
        hasUniformDelivery,
        benefitsConfigured,
        employeeBenefit,
        employeeUniforms,
        progress,
        completedSteps,
        trainingReady: false,
      };
    });
  }, [onboardings, documents, uniforms, benefits]);

  const filtered = useMemo(() => {
    return onboardingCards.filter((item) => {
      const matchesSearch = `
        ${item.employeeName || ''}
        ${item.notes || ''}
        ${item.status || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'TODOS' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [onboardingCards, search, statusFilter]);

  const stats = useMemo(() => {
    const completed = onboardingCards.filter(
      (item) => item.status === 'CONCLUIDO'
    ).length;

    const inProgress = onboardingCards.filter(
      (item) => item.status === 'EM_ANDAMENTO'
    ).length;

    const pendingDocs = onboardingCards.filter(
      (item) => item.pendingDocumentsCount > 0
    ).length;

    return {
      total: onboardingCards.length,
      completed,
      pending: onboardingCards.length - completed,
      inProgress,
      pendingDocs,
    };
  }, [onboardingCards]);

  const renderOverview = () => {
    if (loadingOnboardings || loadingExtras) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando onboarding...
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum onboarding cadastrado.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filtered.map((item) => (
          <div
            key={item.id}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-blue-200'>
                    Onboarding inteligente
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>
                    {item.employeeName}
                  </h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    Iniciado em {formatDate(item.startDate)}
                  </p>
                </div>

                <StatusBadge status={item.status} />
              </div>

              <div className='mt-5'>
                <div className='mb-2 flex items-center justify-between text-xs text-slate-300'>
                  <span>Progresso</span>
                  <span>{item.progress}%</span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-white/10'>
                  <div
                    className='h-full rounded-full bg-white transition-all'
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='flex flex-wrap gap-2'>
                <StepBadge
                  active={item.welcomeSent}
                  label='Boas-vindas enviadas'
                />
                <StepBadge
                  active={item.accessCreated}
                  label='Acessos criados'
                />
                <StepBadge
                  active={item.pendingDocumentsCount === 0}
                  label='Documentação'
                />
                <StepBadge
                  active={item.hasUniformDelivery}
                  label='Fardamento'
                />
                <StepBadge
                  active={item.benefitsConfigured}
                  label='Benefícios'
                />
                <StepBadge active={false} label='Treinamentos' />
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Documentos pendentes</p>
                  <p className='mt-1 text-2xl font-bold text-slate-800'>
                    {item.pendingDocumentsCount}
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {item.pendingDocumentsCount > 0
                      ? item.pendingDocuments.slice(0, 2).join(', ')
                      : 'Tudo entregue'}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Fardamento</p>
                  <p className='mt-1 text-2xl font-bold text-slate-800'>
                    {item.hasUniformDelivery ? 'OK' : 'Pendente'}
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {item.hasUniformDelivery
                      ? 'Entrega registrada no sistema'
                      : 'Nenhuma entrega localizada'}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Benefícios</p>
                  <p className='mt-1 text-2xl font-bold text-slate-800'>
                    {item.benefitsConfigured ? 'OK' : 'Pendente'}
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {item.benefitsConfigured
                      ? 'Configuração já cadastrada'
                      : 'Sem cadastro de benefícios'}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Treinamentos</p>
                  <p className='mt-1 text-2xl font-bold text-slate-800'>
                    Em breve
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    Estrutura preparada para futura integração
                  </p>
                </div>
              </div>

              {item.notes ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Observações</p>
                  <p className='mt-1 text-sm font-medium text-slate-700'>
                    {item.notes}
                  </p>
                </div>
              ) : null}

              <div className='flex flex-wrap gap-3 pt-1'>
                <button
                  type='button'
                  onClick={() => openDrawer(item)}
                  className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800'
                >
                  Editar onboarding
                </button>

                <button
                  type='button'
                  className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
                >
                  Enviar boas-vindas
                </button>

                <button
                  type='button'
                  className='rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100'
                >
                  Gerar acessos
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => {
    if (loadingOnboardings || loadingExtras) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando onboarding...
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Lista de onboardings
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhum onboarding cadastrado.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead className='bg-slate-50'>
                <tr className='text-left'>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Colaborador
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Boas-vindas
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Acessos
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Docs pendentes
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Fardamento
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Benefícios
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filtered.map((item) => (
                  <tr key={item.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5 font-semibold text-slate-800'>
                      {item.employeeName}
                    </td>

                    <td className='px-6 py-5'>
                      <StatusBadge status={item.status} />
                    </td>

                    <td className='px-6 py-5'>
                      <StepBadge
                        active={item.welcomeSent}
                        label={item.welcomeSent ? 'Enviado' : 'Pendente'}
                      />
                    </td>

                    <td className='px-6 py-5'>
                      <StepBadge
                        active={item.accessCreated}
                        label={item.accessCreated ? 'Criado' : 'Pendente'}
                      />
                    </td>

                    <td className='px-6 py-5 text-sm font-semibold text-slate-700'>
                      {item.pendingDocumentsCount}
                    </td>

                    <td className='px-6 py-5'>
                      <StepBadge
                        active={item.hasUniformDelivery}
                        label={
                          item.hasUniformDelivery ? 'Entregue' : 'Pendente'
                        }
                      />
                    </td>

                    <td className='px-6 py-5'>
                      <StepBadge
                        active={item.benefitsConfigured}
                        label={item.benefitsConfigured ? 'OK' : 'Pendente'}
                      />
                    </td>

                    <td className='px-6 py-5'>
                      <div className='flex justify-center'>
                        <button
                          type='button'
                          onClick={() => openDrawer(item)}
                          className='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-blue-200'>
                Jornada de entrada
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Onboarding inteligente
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Acompanhe integração, documentos, acessos, benefícios,
                fardamento e futuras etapas de treinamento em um só lugar.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                onClick={() => openDrawer()}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Novo onboarding
              </button>

              <button className='rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/20'>
                Envio por e-mail
              </button>

              <button className='rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/20'>
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <InfoCard
            title='Total'
            value={stats.total}
            subtitle='Onboardings cadastrados'
            tone='slate'
          />
          <InfoCard
            title='Concluídos'
            value={stats.completed}
            subtitle='Fluxos finalizados'
            tone='green'
          />
          <InfoCard
            title='Em andamento'
            value={stats.inProgress}
            subtitle='Integrações em execução'
            tone='blue'
          />
          <InfoCard
            title='Pendentes'
            value={stats.pending}
            subtitle='Demandam ação'
            tone='amber'
          />
          <InfoCard
            title='Docs pendentes'
            value={stats.pendingDocs}
            subtitle='Com pendência documental'
            tone='red'
          />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                placeholder='Buscar por colaborador, status ou observações'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                <option value='PENDENTE'>Pendente</option>
                <option value='EM_ANDAMENTO'>Em andamento</option>
                <option value='CONCLUIDO'>Concluído</option>
              </select>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Visão premium
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('list')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'list' && renderList()}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      Jornada de integração
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {selectedCard ? 'Editar onboarding' : 'Novo onboarding'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure status, boas-vindas, acessos e observações.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateOrUpdate}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Colaborador
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione o colaborador que entrará no fluxo.
                      </p>
                    </div>

                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Colaborador
                    </label>
                    <select
                      name='employeeId'
                      value={formData.employeeId}
                      onChange={handleChange}
                      className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      disabled={loadingEmployees || Boolean(selectedCard)}
                    >
                      <option value=''>
                        {loadingEmployees
                          ? 'Carregando colaboradores...'
                          : 'Selecione o colaborador'}
                      </option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName || employee.name} —{' '}
                          {employee.department || 'Sem departamento'}
                        </option>
                      ))}
                    </select>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Status e automações
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Marque o andamento da integração e os passos já
                        concluídos.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Status
                        </label>
                        <select
                          name='status'
                          value={formData.status}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value='PENDENTE'>Pendente</option>
                          <option value='EM_ANDAMENTO'>Em andamento</option>
                          <option value='CONCLUIDO'>Concluído</option>
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de início
                        </label>
                        <input
                          type='date'
                          name='startDate'
                          value={formData.startDate}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de conclusão
                        </label>
                        <input
                          type='date'
                          name='completedAt'
                          value={formData.completedAt}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>
                    </div>

                    <div className='mt-5 space-y-4'>
                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='welcomeSent'
                          checked={formData.welcomeSent}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Boas-vindas enviadas
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='accessCreated'
                          checked={formData.accessCreated}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Acessos aos sistemas criados
                        </span>
                      </label>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Observações
                    </label>
                    <textarea
                      name='notes'
                      value={formData.notes}
                      onChange={handleChange}
                      rows='5'
                      placeholder='Ex: aguardar envio de contrato assinado, criar e-mail, pendência de fardamento, etc.'
                      className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    />
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={saving}
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {saving ? 'Salvando...' : 'Salvar onboarding'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Onboarding;
