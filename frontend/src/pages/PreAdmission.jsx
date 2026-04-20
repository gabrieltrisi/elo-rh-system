import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const CONTRACT_OPTIONS = [
  { value: 'CLT', label: 'CLT' },
  { value: 'TERCEIRIZADO', label: 'Terceirizado' },
  { value: 'ESTAGIO', label: 'Estágio' },
  { value: 'JOVEM_APRENDIZ', label: 'Jovem Aprendiz' },
  { value: 'PJ', label: 'PJ' },
  { value: 'TEMPORARIO', label: 'Temporário' },
  { value: 'INTERMITENTE', label: 'Intermitente' },
  { value: 'AUTONOMO', label: 'Autônomo' },
];

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  desiredPosition: '',
  contractType: 'CLT',
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
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando aprovação RH',
    badge: 'border border-orange-200 bg-orange-50 text-orange-700',
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

const normalizeCandidateName = (candidate) =>
  candidate?.fullName || candidate?.name || 'Candidato';

const normalizeAdmissionForm = (item) => ({
  id: item.id,
  candidateId: Number(item.candidateId),
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
  candidate: item.candidate || null,
  candidateName: normalizeCandidateName(item.candidate),
  candidateEmail: item.candidate?.email || '',
  candidatePhone: item.candidate?.phone || '',
  desiredPosition: item.candidate?.desiredPosition || '',
  contractType: item.candidate?.contractType || '',
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
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
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
  const [admissionForms, setAdmissionForms] = useState([]);
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
    fetchAdmissionForms();
  }, []);

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

    if (!formData.fullName.trim()) {
      alert('Informe o nome completo do candidato.');
      return;
    }

    if (!formData.phone.trim()) {
      alert('Informe o telefone do candidato.');
      return;
    }

    if (!formData.desiredPosition.trim()) {
      alert('Informe a vaga desejada.');
      return;
    }

    if (!formData.contractType) {
      alert('Selecione o tipo de contrato.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        desiredPosition: formData.desiredPosition.trim(),
        contractType: formData.contractType,
        expiresAt: formData.expiresAt || null,
        notes: formData.notes.trim() || null,
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
    const phone = String(item.candidatePhone || '').replace(/\D/g, '');
    const publicLink = `${window.location.origin}/admission/${item.token}`;

    if (!phone) {
      alert('O candidato não possui telefone cadastrado.');
      return;
    }

    const message = encodeURIComponent(
      `Olá, ${item.candidateName}! Seu formulário de pré-admissão está disponível no link: ${publicLink}`
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

      alert(
        res.data?.message ||
          'Pré-admissão aprovada e onboarding iniciado com sucesso.'
      );
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
        ${item.candidateName || ''}
        ${item.candidateEmail || ''}
        ${item.candidatePhone || ''}
        ${item.desiredPosition || ''}
        ${item.contractType || ''}
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

    const waitingApproval = admissionForms.filter(
      (item) =>
        item.status === 'AGUARDANDO_APROVACAO' || item.status === 'RESPONDIDO'
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
      waitingApproval,
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
          const canStartOnboarding =
            item.status === 'RESPONDIDO' ||
            item.status === 'AGUARDANDO_APROVACAO';

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
                      {item.candidateName}
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
                      {item.candidateEmail || 'Não informado'}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Telefone</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {item.candidatePhone || 'Não informado'}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Vaga desejada</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {item.desiredPosition || '-'}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm text-slate-500'>Tipo de contrato</p>
                    <p className='mt-1 text-sm font-semibold text-slate-800'>
                      {CONTRACT_OPTIONS.find(
                        (option) => option.value === item.contractType
                      )?.label ||
                        item.contractType ||
                        '-'}
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
                  <div className='rounded-2xl border border-orange-200 bg-orange-50 p-4'>
                    <p className='text-sm text-orange-700'>
                      Última resposta recebida
                    </p>
                    <p className='mt-1 text-sm font-semibold text-orange-800'>
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
                      Aprovar e iniciar onboarding
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
                    Candidato
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Vaga
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Contrato
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Enviado em
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Respondido em
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filteredForms.map((item) => {
                  const canStartOnboarding =
                    item.status === 'RESPONDIDO' ||
                    item.status === 'AGUARDANDO_APROVACAO';

                  return (
                    <tr key={item.id} className='hover:bg-slate-50/70'>
                      <td className='px-6 py-5 font-semibold text-slate-800'>
                        {item.candidateName}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {item.desiredPosition || '-'}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {CONTRACT_OPTIONS.find(
                          (option) => option.value === item.contractType
                        )?.label ||
                          item.contractType ||
                          '-'}
                      </td>

                      <td className='px-6 py-5'>
                        <StatusBadge status={item.status} />
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {formatDateTime(item.sentAt)}
                      </td>

                      <td className='px-6 py-5 text-sm text-slate-700'>
                        {formatDateTime(item.completedAt)}
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
                              Aprovar
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
                Cadastre o candidato com base no currículo, dispare o formulário
                e acompanhe a aprovação até o onboarding.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                onClick={() => openDrawer()}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Novo pré-cadastro
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
            title='Aguardando RH'
            value={stats.waitingApproval}
            subtitle='Prontos para validação'
            tone='orange'
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
                placeholder='Buscar por candidato, telefone, vaga, contrato ou status'
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
                <option value='AGUARDANDO_APROVACAO'>
                  Aguardando aprovação RH
                </option>
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
                      Pré-cadastro do candidato
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Nova pré-admissão
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Cadastre os dados iniciais para disparar o formulário.
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
                        Dados do candidato
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Preencha com base no currículo enviado ao RH.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Nome completo
                        </label>
                        <input
                          type='text'
                          name='fullName'
                          value={formData.fullName}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Digite o nome completo'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Telefone
                        </label>
                        <input
                          type='text'
                          name='phone'
                          value={formData.phone}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='(00) 00000-0000'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          E-mail
                        </label>
                        <input
                          type='email'
                          name='email'
                          value={formData.email}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='email@exemplo.com'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Vaga desejada
                        </label>
                        <input
                          type='text'
                          name='desiredPosition'
                          value={formData.desiredPosition}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Ex: Assistente Administrativo'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tipo de contrato
                        </label>
                        <select
                          name='contractType'
                          value={formData.contractType}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {CONTRACT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

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
                      placeholder='Ex: aprovado na triagem, priorizar retorno, processo urgente.'
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
                      Aprovar e iniciar onboarding
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Defina a data de início para transformar o candidato em
                      colaborador.
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
                        Candidato
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Confirme a data oficial de início para criar o
                        onboarding.
                      </p>
                    </div>

                    <div className='mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Candidato</p>
                      <p className='mt-1 text-base font-semibold text-slate-800'>
                        {selectedAdmission?.candidateName || '-'}
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
                      ? 'Aprovando...'
                      : 'Confirmar aprovação'}
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
