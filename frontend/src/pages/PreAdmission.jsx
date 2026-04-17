import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  expiresAt: '',
  notes: '',
};

const initialStartOnboardingForm = {
  startDate: '',
};

const statusConfig = {
  PENDENTE: {
    label: 'Pendente',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  ENVIADO: {
    label: 'Enviado',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
  },
  RESPONDIDO: {
    label: 'Respondido',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  APROVADO: {
    label: 'Aprovado',
    badge: 'border border-violet-200 bg-violet-50 text-violet-700',
  },
  CONCLUIDO: {
    label: 'Concluído',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const normalizeEmployeeName = (employee) =>
  employee?.name || employee?.fullName || 'Colaborador';

const normalizeAdmissionForm = (item) => ({
  id: item.id,
  employeeId: Number(item.employeeId),
  companyId: Number(item.companyId),
  token: item.token || '',
  status: item.status || 'PENDENTE',
  startDate: item.startDate || '',
  approvedAt: item.approvedAt || '',
  expiresAt: item.expiresAt || '',
  sentAt: item.sentAt || '',
  completedAt: item.completedAt || '',
  notes: item.notes || '',
  createdAt: item.createdAt || '',
  updatedAt: item.updatedAt || '',
  employee: item.employee || null,
  employeeName: normalizeEmployeeName(item.employee),
  employeeEmail: item.employee?.email || '',
  employeePhone: item.employee?.phone || '',
  submissions: Array.isArray(item.submissions) ? item.submissions : [],
});

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
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

const PreAdmission = () => {
  const [employees, setEmployees] = useState([]);
  const [admissionForms, setAdmissionForms] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [activeTab, setActiveTab] = useState('cards');

  const [formData, setFormData] = useState(initialForm);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isStartDrawerOpen, setIsStartDrawerOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [startOnboardingForm, setStartOnboardingForm] = useState(
    initialStartOnboardingForm
  );

  const [saving, setSaving] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState(null);
  const [copyingId, setCopyingId] = useState(null);
  const [startingOnboardingId, setStartingOnboardingId] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([fetchEmployees(), fetchAdmissionForms()]);
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await api.get('/employees');
      setEmployees(res.data?.employees || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchAdmissionForms = async () => {
    try {
      setLoadingForms(true);
      const res = await api.get('/admission');
      const raw = res.data?.admissionForms || [];
      setAdmissionForms(raw.map(normalizeAdmissionForm));
    } catch (error) {
      console.error('Erro ao buscar pré-admissões:', error);
      setAdmissionForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const openDrawer = () => {
    setFormData(initialForm);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setFormData(initialForm);
    setIsDrawerOpen(false);
  };

  const openStartDrawer = (item) => {
    setSelectedAdmission(item);
    setStartOnboardingForm({
      startDate: item.startDate ? item.startDate.slice(0, 10) : '',
    });
    setIsStartDrawerOpen(true);
  };

  const closeStartDrawer = () => {
    setSelectedAdmission(null);
    setStartOnboardingForm(initialStartOnboardingForm);
    setIsStartDrawerOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStartOnboardingChange = (e) => {
    const { name, value } = e.target;

    setStartOnboardingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateAdmission = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      alert('Selecione o colaborador.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        employeeId: Number(formData.employeeId),
        expiresAt: formData.expiresAt || null,
        notes: formData.notes || null,
      };

      const res = await api.post('/admission', payload);
      const publicLink = res.data?.publicLink;

      await fetchAdmissionForms();
      closeDrawer();

      if (publicLink) {
        alert(`Link gerado com sucesso.\n\n${publicLink}`);
      } else {
        alert(res.data?.message || 'Pré-admissão criada com sucesso.');
      }
    } catch (error) {
      console.error('Erro ao criar pré-admissão:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível criar a pré-admissão.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async (item) => {
    try {
      setSendingInviteId(item.id);

      const res = await api.post(`/admission/${item.id}/send`);
      const whatsappLink = res.data?.whatsappLink || '';
      const publicLink = res.data?.publicLink || '';

      await fetchAdmissionForms();

      if (whatsappLink) {
        const shouldOpenWhatsapp = window.confirm(
          `${
            res.data?.message || 'Convite preparado com sucesso.'
          }\n\nDeseja abrir o WhatsApp agora?`
        );

        if (shouldOpenWhatsapp) {
          window.open(whatsappLink, '_blank');
        }
      } else {
        alert(
          `${res.data?.message || 'Convite preparado com sucesso.'}\n\n${
            publicLink || ''
          }`
        );
      }
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      alert(
        error?.response?.data?.message || 'Não foi possível enviar o convite.'
      );
    } finally {
      setSendingInviteId(null);
    }
  };

  const handleCopyLink = async (item) => {
    try {
      setCopyingId(item.id);

      const publicLink = `${window.location.origin}/admission/${item.token}`;
      await navigator.clipboard.writeText(publicLink);

      alert('Link copiado com sucesso.');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      alert('Não foi possível copiar o link.');
    } finally {
      setCopyingId(null);
    }
  };

  const handleOpenWhatsApp = (item) => {
    const phone = String(item.employeePhone || '').replace(/\D/g, '');
    const publicLink = `${window.location.origin}/admission/${item.token}`;

    if (!phone) {
      alert('O colaborador não possui telefone cadastrado.');
      return;
    }

    const message = encodeURIComponent(
      `Olá, ${item.employeeName}! Seu formulário de pré-admissão está disponível no link: ${publicLink}`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleStartOnboarding = async (e) => {
    e.preventDefault();

    if (!selectedAdmission?.id) {
      alert('Pré-admissão inválida.');
      return;
    }

    if (!startOnboardingForm.startDate) {
      alert('Informe a data de início do colaborador.');
      return;
    }

    try {
      setStartingOnboardingId(selectedAdmission.id);

      const res = await api.post(
        `/admission/${selectedAdmission.id}/start-onboarding`,
        {
          startDate: startOnboardingForm.startDate,
        }
      );

      await fetchAdmissionForms();
      closeStartDrawer();

      alert(res.data?.message || 'Onboarding iniciado com sucesso.');
    } catch (error) {
      console.error('Erro ao iniciar onboarding:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível iniciar o onboarding.'
      );
    } finally {
      setStartingOnboardingId(null);
    }
  };

  const filteredForms = useMemo(() => {
    return admissionForms.filter((item) => {
      const matchesSearch = `
        ${item.employeeName || ''}
        ${item.employeeEmail || ''}
        ${item.employeePhone || ''}
        ${item.notes || ''}
        ${item.status || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'TODOS' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [admissionForms, search, statusFilter]);

  const stats = useMemo(() => {
    const sent = admissionForms.filter(
      (item) => item.status === 'ENVIADO'
    ).length;
    const answered = admissionForms.filter(
      (item) => item.status === 'RESPONDIDO'
    ).length;
    const approved = admissionForms.filter(
      (item) => item.status === 'APROVADO'
    ).length;
    const pending = admissionForms.filter(
      (item) => item.status === 'PENDENTE'
    ).length;

    return {
      total: admissionForms.length,
      pending,
      sent,
      answered,
      approved,
    };
  }, [admissionForms]);

  const renderCards = () => {
    if (loadingForms) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando pré-admissões...
        </div>
      );
    }

    if (filteredForms.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhuma pré-admissão cadastrada.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filteredForms.map((item) => {
          const publicLink = `${window.location.origin}/admission/${item.token}`;
          const lastSubmission = item.submissions?.[0] || null;
          const canStartOnboarding = item.status === 'RESPONDIDO';

          return (
            <div
              key={item.id}
              className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
            >
              <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-5 py-5 text-white'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                      Pré-admissão
                    </p>
                    <h3 className='mt-2 text-2xl font-bold'>
                      {item.employeeName}
                    </h3>
                    <p className='mt-1 text-sm text-slate-300'>
                      Criado em {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>
              </div>

              <div className='space-y-5 p-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>E-mail</p>
                    <p className='mt-1 break-all text-sm font-semibold text-slate-800'>
                      {item.employeeEmail || 'Não informado'}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Telefone</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {item.employeePhone || 'Não informado'}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Enviado em</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {formatDateTime(item.sentAt)}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Respondido em</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {formatDateTime(item.completedAt)}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Data de início</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {formatDate(item.startDate)}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Aprovado em</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {formatDateTime(item.approvedAt)}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2'>
                    <p className='text-sm text-slate-500'>Link público</p>
                    <p className='mt-1 break-all text-xs font-medium text-slate-700'>
                      {publicLink}
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

                {lastSubmission ? (
                  <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
                    <p className='text-sm text-emerald-700'>
                      Última resposta recebida
                    </p>
                    <p className='mt-1 text-sm font-semibold text-emerald-800'>
                      {formatDateTime(lastSubmission.createdAt)}
                    </p>
                  </div>
                ) : null}

                <div className='flex flex-wrap gap-3 pt-1'>
                  <button
                    type='button'
                    onClick={() => handleSendInvite(item)}
                    disabled={sendingInviteId === item.id}
                    className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {sendingInviteId === item.id
                      ? 'Preparando...'
                      : 'Enviar convite'}
                  </button>

                  <button
                    type='button'
                    onClick={() => handleCopyLink(item)}
                    disabled={copyingId === item.id}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {copyingId === item.id ? 'Copiando...' : 'Copiar link'}
                  </button>

                  <button
                    type='button'
                    onClick={() => handleOpenWhatsApp(item)}
                    className='rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100'
                  >
                    WhatsApp
                  </button>

                  {canStartOnboarding ? (
                    <button
                      type='button'
                      onClick={() => openStartDrawer(item)}
                      className='rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100'
                    >
                      Iniciar onboarding
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = () => {
    if (loadingForms) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando pré-admissões...
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Lista de pré-admissões
          </h3>
        </div>

        {filteredForms.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma pré-admissão cadastrada.
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
                    E-mail
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Enviado em
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Respondido em
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Início
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filteredForms.map((item) => {
                  const canStartOnboarding = item.status === 'RESPONDIDO';

                  return (
                    <tr key={item.id} className='hover:bg-slate-50/70'>
                      <td className='px-6 py-5 font-semibold text-slate-800'>
                        {item.employeeName}
                      </td>

                      <td className='px-6 py-5'>
                        <StatusBadge status={item.status} />
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {item.employeeEmail || '-'}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {formatDateTime(item.sentAt)}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {formatDateTime(item.completedAt)}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {formatDate(item.startDate)}
                      </td>

                      <td className='px-6 py-5'>
                        <div className='flex flex-wrap justify-center gap-2'>
                          <button
                            type='button'
                            onClick={() => handleSendInvite(item)}
                            disabled={sendingInviteId === item.id}
                            className='rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
                          >
                            {sendingInviteId === item.id ? '...' : 'Enviar'}
                          </button>

                          <button
                            type='button'
                            onClick={() => handleCopyLink(item)}
                            className='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                          >
                            Link
                          </button>

                          <button
                            type='button'
                            onClick={() => handleOpenWhatsApp(item)}
                            className='rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100'
                          >
                            WhatsApp
                          </button>

                          {canStartOnboarding ? (
                            <button
                              type='button'
                              onClick={() => openStartDrawer(item)}
                              className='rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100'
                            >
                              Iniciar onboarding
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
                Etapa anterior ao onboarding
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Pré-Admissão
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Gere links, acompanhe envios, valide respostas e libere o início
                do onboarding com data definida.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                onClick={() => openDrawer()}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Nova pré-admissão
              </button>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <InfoCard
            title='Total'
            value={stats.total}
            subtitle='Formulários gerados'
            tone='slate'
          />
          <InfoCard
            title='Pendentes'
            value={stats.pending}
            subtitle='Ainda não enviados'
            tone='amber'
          />
          <InfoCard
            title='Enviados'
            value={stats.sent}
            subtitle='Aguardando resposta'
            tone='blue'
          />
          <InfoCard
            title='Respondidos'
            value={stats.answered}
            subtitle='Prontos para validação'
            tone='green'
          />
          <InfoCard
            title='Aprovados'
            value={stats.approved}
            subtitle='Já migrados ao onboarding'
            tone='violet'
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
                placeholder='Buscar por colaborador, e-mail, telefone ou status'
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
                <option value='ENVIADO'>Enviado</option>
                <option value='RESPONDIDO'>Respondido</option>
                <option value='APROVADO'>Aprovado</option>
                <option value='CONCLUIDO'>Concluído</option>
              </select>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('cards')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'cards'
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

        {activeTab === 'cards' && renderCards()}
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
                      Etapa anterior ao onboarding
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Nova pré-admissão
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Gere o link do colaborador e prepare o disparo do convite.
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
              onSubmit={handleCreateAdmission}
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
                        Selecione quem receberá o formulário de pré-admissão.
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
                      disabled={loadingEmployees}
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
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Expira em
                        </label>
                        <input
                          type='date'
                          name='expiresAt'
                          value={formData.expiresAt}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>
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
                      placeholder='Ex: envio imediato, admissão urgente, aguardar retorno do colaborador.'
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
                    {saving ? 'Gerando...' : 'Gerar pré-admissão'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStartDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeStartDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeStartDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700'>
                      Aprovação da pré-admissão
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Iniciar onboarding
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Defina a data de início do colaborador para liberar o
                      onboarding.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeStartDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleStartOnboarding}
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
                        Confirme a data oficial de início para criar o
                        onboarding.
                      </p>
                    </div>

                    <div className='mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Colaborador</p>
                      <p className='mt-1 text-base font-semibold text-slate-800'>
                        {selectedAdmission?.employeeName || '-'}
                      </p>
                    </div>

                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Data de início
                    </label>
                    <input
                      type='date'
                      name='startDate'
                      value={startOnboardingForm.startDate}
                      onChange={handleStartOnboardingChange}
                      className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    />
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeStartDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    disabled={startingOnboardingId === selectedAdmission?.id}
                    className='rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {startingOnboardingId === selectedAdmission?.id
                      ? 'Iniciando...'
                      : 'Confirmar e iniciar onboarding'}
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

export default PreAdmission;
