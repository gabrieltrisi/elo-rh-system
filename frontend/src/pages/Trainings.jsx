import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const initialForm = {
  id: null,
  companyId: '',
  employeeId: '',
  title: '',
  category: '',
  issuerName: '',
  workloadHours: '',
  completedAt: '',
  expiresAt: '',
  status: 'CONCLUIDO',
  isMandatory: true,
  renewalDays: '',
  description: '',
  notes: '',
  certificate: null,
};

const validityBadgeMap = {
  VALIDO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  VENCENDO: 'border-amber-200 bg-amber-50 text-amber-700',
  VENCIDO: 'border-rose-200 bg-rose-50 text-rose-700',
  PENDENTE: 'border-slate-300 bg-slate-100 text-slate-700',
  SEM_VALIDADE: 'border-blue-200 bg-blue-50 text-blue-700',
};

const operationalStatusLabels = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluido',
  VENCIDO: 'Vencido',
  RECICLAGEM: 'Reciclagem',
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const createBlobUrl = (data) => {
  const blob = data instanceof Blob ? data : new Blob([data]);
  return URL.createObjectURL(blob);
};

function Trainings() {
  const { hasPermission } = useAuthSession();
  const [payload, setPayload] = useState({
    trainings: [],
    summary: {
      total: 0,
      valid: 0,
      expiringSoon: 0,
      expired: 0,
      pendingEmployees: 0,
      recentAttachments: 0,
    },
    options: {
      employees: [],
      companies: [],
      categories: [],
      issuers: [],
    },
  });
  const [filters, setFilters] = useState({
    search: '',
    employeeId: '',
    category: '',
    validityStatus: '',
    issuerName: '',
    issueStart: '',
    issueEnd: '',
    expirationStart: '',
    expirationEnd: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [attachmentActionKey, setAttachmentActionKey] = useState(null);

  const canRead = hasPermission('trainings.read');
  const canCreate = hasPermission('trainings.create');
  const canUpdate = hasPermission('trainings.update');
  const canReadFiles = hasPermission('trainings.files.read');

  const trainings = payload.trainings || [];
  const summary = payload.summary || {};
  const options = payload.options || {};
  const employees = options.employees || [];
  const categories = options.categories || [];
  const issuers = options.issuers || [];
  const companies = options.companies || [];

  useEffect(() => {
    if (canRead) {
      fetchTrainings();
    }
  }, [canRead, filters]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trainings', {
        params: filters,
      });
      setPayload({
        trainings: response.data?.trainings || [],
        summary: response.data?.summary || payload.summary,
        options: response.data?.options || payload.options,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Nao foi possivel carregar certificados e capacitacoes.'
      );
    } finally {
      setLoading(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        label: 'Total de certificados',
        value: summary.total || 0,
        helper: 'Base atual de capacitacoes anexadas',
      },
      {
        label: 'Validos',
        value: summary.valid || 0,
        helper: 'Certificados regulares e dentro da validade',
      },
      {
        label: 'Vencendo em breve',
        value: summary.expiringSoon || 0,
        helper: 'Janela de atencao para renovacao',
      },
      {
        label: 'Vencidos',
        value: summary.expired || 0,
        helper: 'Casos que exigem regularizacao imediata',
      },
      {
        label: 'Colaboradores com pendencias',
        value: summary.pendingEmployees || 0,
        helper: 'Pessoas com status critico ou acompanhamento',
      },
      {
        label: 'Ultimos anexos',
        value: summary.recentAttachments || 0,
        helper: 'Registros recentes com certificado anexado',
      },
    ],
    [summary]
  );

  const resetDrawer = () => {
    setFormData({
      ...initialForm,
      companyId: String(companies[0]?.id || ''),
    });
    setDrawerOpen(false);
  };

  const openCreateDrawer = () => {
    resetDrawer();
    setDrawerOpen(true);
  };

  const openEditDrawer = (item) => {
    setFormData({
      id: item.id,
      companyId: String(item.company?.id || ''),
      employeeId: String(item.employee?.id || ''),
      title: item.training?.title || '',
      category: item.training?.category || '',
      issuerName: item.issuerName || '',
      workloadHours:
        item.training?.workloadHours !== null &&
        item.training?.workloadHours !== undefined
          ? String(item.training.workloadHours)
          : '',
      completedAt: item.completedAt ? item.completedAt.slice(0, 10) : '',
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
      status: item.operationalStatus || 'CONCLUIDO',
      isMandatory: Boolean(item.training?.isMandatory),
      renewalDays:
        item.training?.renewalDays !== null &&
        item.training?.renewalDays !== undefined
          ? String(item.training.renewalDays)
          : '',
      description: item.training?.description || '',
      notes: item.notes || '',
      certificate: null,
    });
    setDrawerOpen(true);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCertificateChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      certificate: file,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.employeeId || !formData.title || !formData.category) {
      toast.error('Preencha colaborador, nome do certificado e categoria.');
      return;
    }

    try {
      setSaving(true);
      const payloadForm = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (key === 'id') return;
        if (key === 'certificate' && !value) return;
        payloadForm.append(key, value);
      });

      if (formData.id) {
        await api.put(`/trainings/${formData.id}`, payloadForm, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/trainings', payloadForm, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      toast.success(
        formData.id
          ? 'Certificado atualizado com sucesso.'
          : 'Certificado cadastrado com sucesso.'
      );
      resetDrawer();
      await fetchTrainings();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Nao foi possivel salvar o certificado.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Deseja remover o certificado "${item.training?.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/trainings/${item.id}`, {
        params: {
          companyId: item.company?.id,
        },
      });
      toast.success('Certificado removido com sucesso.');
      await fetchTrainings();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Nao foi possivel remover o certificado.'
      );
    }
  };

  const handleAttachment = async (item, mode = 'view') => {
    const actionKey = `${mode}-${item.id}`;

    try {
      setAttachmentActionKey(actionKey);
      const endpoint =
        mode === 'download'
          ? `/trainings/${item.id}/attachment/download`
          : `/trainings/${item.id}/attachment/view`;

      const response = await api.get(endpoint, {
        responseType: 'blob',
      });
      const url = createBlobUrl(response.data);

      if (mode === 'download') {
        const link = document.createElement('a');
        link.href = url;
        link.download = item.attachment?.fileName || 'certificado';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Nao foi possivel abrir o anexo do certificado.'
      );
    } finally {
      setAttachmentActionKey(null);
    }
  };

  if (!canRead) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm'>
        Seu perfil nao possui acesso ao controle de certificados e capacitacoes.
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <section className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-xs font-semibold uppercase tracking-[0.26em] text-blue-200'>
                Gestao de certificados
              </p>
              <h1 className='mt-3 text-4xl font-black tracking-tight'>
                Treinamentos
              </h1>
              <p className='mt-4 text-lg leading-8 text-slate-200'>
                Controle certificados, capacitacoes anexadas, emissao, validade
                e vencimento por colaborador com trilha rastreavel e storage
                corporativo quando habilitado.
              </p>
            </div>

            {canCreate ? (
              <button
                type='button'
                onClick={openCreateDrawer}
                className='rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15'
              >
                Novo certificado
              </button>
            ) : null}
          </div>
        </section>

        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {cards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </section>

        <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <Field
              label='Buscar'
              name='search'
              value={filters.search}
              onChange={handleFilterChange}
              placeholder='Colaborador, categoria, emissor ou observacao'
            />
            <SelectField
              label='Colaborador'
              name='employeeId'
              value={filters.employeeId}
              onChange={handleFilterChange}
              includeDefault={false}
              options={[
                { value: '', label: 'Todos' },
                ...employees.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              ]}
            />
            <SelectField
              label='Categoria'
              name='category'
              value={filters.category}
              onChange={handleFilterChange}
              includeDefault={false}
              options={[
                { value: '', label: 'Todas' },
                ...categories.map((item) => ({ value: item, label: item })),
              ]}
            />
            <SelectField
              label='Validade'
              name='validityStatus'
              value={filters.validityStatus}
              onChange={handleFilterChange}
              includeDefault={false}
              options={[
                { value: '', label: 'Todas' },
                { value: 'VALIDO', label: 'Valido' },
                { value: 'VENCENDO', label: 'Vencendo' },
                { value: 'VENCIDO', label: 'Vencido' },
                { value: 'PENDENTE', label: 'Pendente' },
                { value: 'SEM_VALIDADE', label: 'Sem validade' },
              ]}
            />
            <SelectField
              label='Instituicao emissora'
              name='issuerName'
              value={filters.issuerName}
              onChange={handleFilterChange}
              includeDefault={false}
              options={[
                { value: '', label: 'Todas' },
                ...issuers.map((item) => ({ value: item, label: item })),
              ]}
            />
            <Field
              label='Emissao de'
              name='issueStart'
              type='date'
              value={filters.issueStart}
              onChange={handleFilterChange}
            />
            <Field
              label='Emissao ate'
              name='issueEnd'
              type='date'
              value={filters.issueEnd}
              onChange={handleFilterChange}
            />
            <Field
              label='Validade de'
              name='expirationStart'
              type='date'
              value={filters.expirationStart}
              onChange={handleFilterChange}
            />
            <Field
              label='Validade ate'
              name='expirationEnd'
              type='date'
              value={filters.expirationEnd}
              onChange={handleFilterChange}
            />
          </div>
        </section>

        <section className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h2 className='text-2xl font-bold text-slate-900'>
              Certificados e capacitacoes
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Leitura operacional de certificados por colaborador, validade e
              anexo governado.
            </p>
          </div>

          {loading ? (
            <div className='px-6 py-12 text-center text-slate-500'>
              Carregando certificados...
            </div>
          ) : !trainings.length ? (
            <div className='px-6 py-12 text-center text-slate-500'>
              Nenhum certificado encontrado para os filtros atuais.
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
                      Certificado / capacitacao
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Emissor
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Emissao
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Validade
                    </th>
                    <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Situacao
                    </th>
                    <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {trainings.map((item) => (
                    <tr key={item.id} className='hover:bg-slate-50/70'>
                      <td className='px-6 py-5'>
                        <p className='font-semibold text-slate-900'>
                          {item.employee?.name || '-'}
                        </p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {item.employee?.department || 'Sem setor'} -{' '}
                          {item.employee?.role || 'Sem cargo'}
                        </p>
                      </td>
                      <td className='px-6 py-5'>
                        <p className='font-semibold text-slate-900'>
                          {item.training?.title}
                        </p>
                        <p className='mt-1 text-sm text-slate-500'>
                          {item.training?.category || '-'} -{' '}
                          {item.training?.workloadHours
                            ? `${item.training.workloadHours}h`
                            : 'Carga horaria livre'}
                        </p>
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600'>
                        {item.issuerName || '-'}
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600'>
                        {formatDate(item.completedAt)}
                      </td>
                      <td className='px-6 py-5 text-sm text-slate-600'>
                        {formatDate(item.expiresAt)}
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex flex-col gap-2'>
                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                              validityBadgeMap[item.validityStatus] ||
                              validityBadgeMap.PENDENTE
                            }`}
                          >
                            {item.validityLabel}
                          </span>
                          <span className='text-xs font-medium text-slate-500'>
                            {operationalStatusLabels[item.operationalStatus] ||
                              item.operationalStatus}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex flex-wrap justify-center gap-2'>
                          {canReadFiles && item.attachment ? (
                            <>
                              <MiniActionButton
                                label={
                                  attachmentActionKey === `view-${item.id}`
                                    ? 'Abrindo...'
                                    : 'Visualizar'
                                }
                                tone='blue'
                                onClick={() => handleAttachment(item, 'view')}
                              />
                              <MiniActionButton
                                label={
                                  attachmentActionKey === `download-${item.id}`
                                    ? 'Baixando...'
                                    : 'Baixar'
                                }
                                tone='slate'
                                onClick={() => handleAttachment(item, 'download')}
                              />
                            </>
                          ) : null}
                          {canUpdate ? (
                            <>
                              <MiniActionButton
                                label='Editar'
                                tone='violet'
                                onClick={() => openEditDrawer(item)}
                              />
                              <MiniActionButton
                                label='Excluir'
                                tone='rose'
                                onClick={() => handleDelete(item)}
                              />
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {drawerOpen ? (
        <div className='fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm'>
          <div className='h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl'>
            <div className='border-b border-slate-200 px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.24em] text-slate-400'>
                    Certificados e capacitacoes
                  </p>
                  <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                    {formData.id ? 'Editar certificado' : 'Novo certificado'}
                  </h2>
                  <p className='mt-2 text-sm text-slate-500'>
                    Vincule certificados ao colaborador, anexe o documento e
                    mantenha validade e historico atualizados.
                  </p>
                </div>
                <button
                  type='button'
                  onClick={resetDrawer}
                  className='rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Fechar
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className='space-y-6 px-6 py-6'>
              <div className='grid gap-5 md:grid-cols-2'>
                <SelectField
                  label='Empresa'
                  name='companyId'
                  value={formData.companyId}
                  onChange={handleFormChange}
                  options={companies.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                />
                <SelectField
                  label='Colaborador'
                  name='employeeId'
                  value={formData.employeeId}
                  onChange={handleFormChange}
                  options={employees.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                />
                <Field
                  label='Nome do certificado'
                  name='title'
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder='Ex: NR-10 Basico'
                  wide
                />
                <Field
                  label='Categoria / tipo'
                  name='category'
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder='Ex: Seguranca do trabalho'
                />
                <Field
                  label='Instituicao emissora'
                  name='issuerName'
                  value={formData.issuerName}
                  onChange={handleFormChange}
                  placeholder='Ex: SENAI'
                />
                <Field
                  label='Carga horaria'
                  name='workloadHours'
                  type='number'
                  value={formData.workloadHours}
                  onChange={handleFormChange}
                  placeholder='Ex: 8'
                />
                <SelectField
                  label='Status do registro'
                  name='status'
                  value={formData.status}
                  onChange={handleFormChange}
                  options={Object.entries(operationalStatusLabels).map(
                    ([value, label]) => ({
                      value,
                      label,
                    })
                  )}
                />
                <Field
                  label='Data de emissao'
                  name='completedAt'
                  type='date'
                  value={formData.completedAt}
                  onChange={handleFormChange}
                />
                <Field
                  label='Data de validade'
                  name='expiresAt'
                  type='date'
                  value={formData.expiresAt}
                  onChange={handleFormChange}
                />
                <Field
                  label='Antecedencia de renovacao (dias)'
                  name='renewalDays'
                  type='number'
                  value={formData.renewalDays}
                  onChange={handleFormChange}
                  placeholder='Ex: 30'
                />
                <TextArea
                  label='Descricao'
                  name='description'
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                />
                <TextArea
                  label='Observacoes'
                  name='notes'
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                />
                <label className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 md:col-span-2'>
                  <input
                    type='checkbox'
                    name='isMandatory'
                    checked={Boolean(formData.isMandatory)}
                    onChange={handleFormChange}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900'
                  />
                  Certificacao obrigatoria / critica
                </label>
                <label className='block text-sm font-semibold text-slate-700 md:col-span-2'>
                  Arquivo do certificado
                  <input
                    type='file'
                    onChange={handleCertificateChange}
                    className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium'
                  />
                  <span className='mt-2 block text-xs text-slate-500'>
                    {formData.certificate
                      ? `Arquivo selecionado: ${formData.certificate.name}`
                      : 'Anexe o certificado ou comprovante da capacitacao.'}
                  </span>
                </label>
              </div>

              <div className='flex items-center justify-end gap-3 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={resetDrawer}
                  className='rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {saving
                    ? 'Salvando certificado...'
                    : formData.id
                    ? 'Salvar certificado'
                    : 'Cadastrar certificado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <p className='text-sm text-slate-500'>{label}</p>
      <h2 className='mt-2 text-3xl font-bold text-slate-900'>{value}</h2>
      <p className='mt-2 text-sm text-slate-500'>{helper}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  wide = false,
}) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${wide ? 'md:col-span-2' : ''}`}>
      {label}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  includeDefault = true,
}) {
  return (
    <label className='block text-sm font-semibold text-slate-700'>
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
      >
        {includeDefault ? <option value=''>Selecione</option> : null}
        {options.map((item) => (
          <option key={`${name}-${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, name, value, onChange, rows = 4 }) {
  return (
    <label className='block text-sm font-semibold text-slate-700 md:col-span-2'>
      {label}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className='mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
      />
    </label>
  );
}

function MiniActionButton({ label, tone = 'blue', onClick }) {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    rose: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

export default Trainings;
