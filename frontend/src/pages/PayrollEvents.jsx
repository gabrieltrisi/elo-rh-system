import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const initialEventForm = {
  code: '',
  name: '',
  type: 'PROVENTO',
  category: '',
  calculationType: 'MANUAL',
  defaultValue: '0',
  defaultQuantity: '1',
  defaultUnitValue: '0',
  incidenceINSS: false,
  incidenceFGTS: false,
  incidenceIRRF: false,
  isFixed: false,
  isVariable: true,
  isActive: true,
  description: '',
};

const typeOptions = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PROVENTO', label: 'Proventos' },
  { value: 'DESCONTO', label: 'Descontos' },
  { value: 'INFORMATIVO', label: 'Informativos' },
];

const calculationTypeOptions = [
  { value: 'FIXO', label: 'Fixo' },
  { value: 'PERCENTUAL', label: 'Percentual' },
  { value: 'FORMULA', label: 'Formula' },
  { value: 'MANUAL', label: 'Manual' },
];

const formatDateTime = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const SummaryCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-bold'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

const InfoBox = ({ label, value }) => (
  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
    <p className='text-sm text-slate-500'>{label}</p>
    <p className='mt-1 text-sm font-semibold text-slate-800'>{value}</p>
  </div>
);

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border border-amber-200 bg-amber-50 text-amber-700'
    }`}
  >
    {active ? 'Ativo' : 'Inativo'}
  </span>
);

const TypeBadge = ({ type }) => {
  const tones = {
    PROVENTO: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    DESCONTO: 'border border-rose-200 bg-rose-50 text-rose-700',
    INFORMATIVO: 'border border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        tones[type] || 'border border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {type}
    </span>
  );
};

function PayrollEvents() {
  const { hasPermission } = useAuthSession();
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    activeEvents: 0,
    inactiveEvents: 0,
    fixedEvents: 0,
    variableEvents: 0,
    provents: 0,
    discounts: 0,
    informative: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [incidenceFilter, setIncidenceFilter] = useState('TODOS');
  const [activeTab, setActiveTab] = useState('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(initialEventForm);
  const [saving, setSaving] = useState(false);

  const canReadEvents = hasPermission('payroll.event.read');
  const canCreateEvents = hasPermission('payroll.events.create');
  const canUpdateEvents = hasPermission('payroll.events.update');
  const canToggleEvents = hasPermission('payroll.events.status');

  useEffect(() => {
    fetchEvents();
  }, [search, typeFilter, statusFilter, incidenceFilter]);

  const fetchEvents = async () => {
    if (!canReadEvents) {
      setEvents([]);
      setSummary(initialEventSummary());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (typeFilter !== 'TODOS') params.type = typeFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;
      if (incidenceFilter !== 'TODOS') params.incidence = incidenceFilter;

      const response = await api.get('/payroll/events', { params });
      setEvents(response.data?.events || []);
      setSummary(response.data?.summary || initialEventSummary());
    } catch (error) {
      console.error('Erro ao carregar eventos da folha:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar os eventos da folha.'
      );
      setEvents([]);
      setSummary(initialEventSummary());
    } finally {
      setLoading(false);
    }
  };

  const groupedCategories = useMemo(() => {
    return events.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = 0;
      }

      acc[item.category] += 1;
      return acc;
    }, {});
  }, [events]);

  const openCreateDrawer = () => {
    setEditingEvent(null);
    setFormData(initialEventForm);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (eventRecord) => {
    setEditingEvent(eventRecord);
    setFormData({
      code: eventRecord.code || '',
      name: eventRecord.name || '',
      type: eventRecord.type || 'PROVENTO',
      category: eventRecord.category || '',
      calculationType: eventRecord.calculationType || 'MANUAL',
      defaultValue: String(eventRecord.defaultValue ?? '0'),
      defaultQuantity: String(eventRecord.defaultQuantity ?? '1'),
      defaultUnitValue: String(eventRecord.defaultUnitValue ?? '0'),
      incidenceINSS: Boolean(eventRecord.incidenceINSS),
      incidenceFGTS: Boolean(eventRecord.incidenceFGTS),
      incidenceIRRF: Boolean(eventRecord.incidenceIRRF),
      isFixed: Boolean(eventRecord.isFixed),
      isVariable: Boolean(eventRecord.isVariable),
      isActive: Boolean(eventRecord.isActive),
      description: eventRecord.description || '',
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingEvent(null);
    setFormData(initialEventForm);
    setIsDrawerOpen(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.code.trim() || !formData.name.trim() || !formData.category.trim()) {
      alert('Informe codigo, nome e categoria do evento.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category.trim(),
        calculationType: formData.calculationType,
        defaultValue: formData.defaultValue,
        defaultQuantity: formData.defaultQuantity,
        defaultUnitValue: formData.defaultUnitValue,
        incidenceINSS: formData.incidenceINSS,
        incidenceFGTS: formData.incidenceFGTS,
        incidenceIRRF: formData.incidenceIRRF,
        isFixed: formData.isFixed,
        isVariable: formData.isVariable,
        isActive: formData.isActive,
        description: formData.description.trim() || null,
      };

      if (editingEvent) {
        await api.put(`/payroll/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/payroll/events', payload);
      }

      closeDrawer();
      fetchEvents();
    } catch (error) {
      console.error('Erro ao salvar evento da folha:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel salvar o evento da folha.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (eventRecord) => {
    try {
      await api.patch(`/payroll/events/${eventRecord.id}/status`, {
        isActive: !eventRecord.isActive,
      });
      fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar status do evento:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel atualizar o status do evento.'
      );
    }
  };

  const handleDuplicate = async (eventRecord) => {
    try {
      await api.post(`/payroll/events/${eventRecord.id}/duplicate`);
      fetchEvents();
    } catch (error) {
      console.error('Erro ao duplicar evento da folha:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel duplicar o evento da folha.'
      );
    }
  };

  const renderEventCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando eventos da folha...
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum evento encontrado para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {events.map((eventRecord) => (
          <div
            key={eventRecord.id}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-800 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-200'>
                    Evento da folha
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>{eventRecord.name}</h3>
                  <p className='mt-1 text-sm text-slate-300'>
                    {eventRecord.code} - {eventRecord.category}
                  </p>
                </div>

                <StatusBadge active={eventRecord.isActive} />
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='flex flex-wrap gap-2'>
                <TypeBadge type={eventRecord.type} />
                <span className='inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700'>
                  {eventRecord.calculationType}
                </span>
                {eventRecord.isFixed ? (
                  <span className='inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700'>
                    Fixo
                  </span>
                ) : null}
                {eventRecord.isVariable ? (
                  <span className='inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                    Variavel
                  </span>
                ) : null}
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox
                  label='Valor padrao'
                  value={formatCurrency(eventRecord.defaultValue)}
                />
                <InfoBox
                  label='Quantidade padrao'
                  value={String(eventRecord.defaultQuantity || 0)}
                />
                <InfoBox
                  label='Valor unitario padrao'
                  value={formatCurrency(eventRecord.defaultUnitValue)}
                />
                <InfoBox
                  label='Atualizacao'
                  value={formatDateTime(eventRecord.updatedAt)}
                />
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-700'>Incidencias</p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <IncidenceBadge
                    label='INSS'
                    active={eventRecord.incidenceINSS}
                  />
                  <IncidenceBadge
                    label='FGTS'
                    active={eventRecord.incidenceFGTS}
                  />
                  <IncidenceBadge
                    label='IRRF'
                    active={eventRecord.incidenceIRRF}
                  />
                </div>
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm text-slate-500'>Descricao</p>
                <p className='mt-1 text-sm font-medium text-slate-700'>
                  {eventRecord.description || 'Sem descricao complementar.'}
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                {canUpdateEvents ? (
                  <ActionButton
                    label='Editar evento'
                    tone='blue'
                    onClick={() => openEditDrawer(eventRecord)}
                  />
                ) : null}
                {canToggleEvents ? (
                  <ActionButton
                    label={eventRecord.isActive ? 'Inativar' : 'Ativar'}
                    tone='amber'
                    onClick={() => handleToggleStatus(eventRecord)}
                  />
                ) : null}
                {canCreateEvents ? (
                  <ActionButton
                    label='Duplicar'
                    tone='violet'
                    onClick={() => handleDuplicate(eventRecord)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEventList = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando eventos da folha...
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum evento encontrado para os filtros aplicados.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Catalogo de rubricas
          </h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Evento
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Tipo
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Calculo
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Incidencias
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Valor padrao
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Status
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Acoes
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {events.map((eventRecord) => (
                <tr key={eventRecord.id} className='hover:bg-slate-50/70'>
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>
                        {eventRecord.name}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {eventRecord.code} - {eventRecord.category}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-5'>
                    <TypeBadge type={eventRecord.type} />
                  </td>
                  <td className='px-6 py-5 text-sm font-semibold text-slate-700'>
                    {eventRecord.calculationType}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap gap-2'>
                      <IncidenceBadge
                        label='INSS'
                        active={eventRecord.incidenceINSS}
                      />
                      <IncidenceBadge
                        label='FGTS'
                        active={eventRecord.incidenceFGTS}
                      />
                      <IncidenceBadge
                        label='IRRF'
                        active={eventRecord.incidenceIRRF}
                      />
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatCurrency(eventRecord.defaultValue)}
                  </td>
                  <td className='px-6 py-5'>
                    <StatusBadge active={eventRecord.isActive} />
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {canUpdateEvents ? (
                        <MiniActionButton
                          label='Editar'
                          tone='blue'
                          onClick={() => openEditDrawer(eventRecord)}
                        />
                      ) : null}
                      {canToggleEvents ? (
                        <MiniActionButton
                          label={eventRecord.isActive ? 'Inativar' : 'Ativar'}
                          tone='amber'
                          onClick={() => handleToggleStatus(eventRecord)}
                        />
                      ) : null}
                      {canCreateEvents ? (
                        <MiniActionButton
                          label='Duplicar'
                          tone='violet'
                          onClick={() => handleDuplicate(eventRecord)}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!canReadEvents) {
    return (
      <div className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm'>
        <p className='text-sm font-semibold uppercase tracking-[0.2em]'>
          Departamento Pessoal
        </p>
        <h1 className='mt-3 text-3xl font-bold'>Eventos da Folha</h1>
        <p className='mt-3 text-base'>
          Seu perfil nao possui acesso para consultar o catalogo de eventos da
          folha.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-amber-800 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-amber-200'>
                Departamento Pessoal
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Eventos da Folha
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Governe rubricas, incidencias e regras do processamento da
                competencia com uma base real para proventos, descontos e itens
                informativos.
              </p>
            </div>

            {canCreateEvents ? (
              <div className='flex flex-wrap gap-3'>
                <button
                  type='button'
                  onClick={openCreateDrawer}
                  className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
                >
                  + Novo evento
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <SummaryCard
            title='Total'
            value={summary.totalEvents}
            subtitle='Rubricas cadastradas'
            tone='slate'
          />
          <SummaryCard
            title='Ativos'
            value={summary.activeEvents}
            subtitle='Disponiveis para novo processamento'
            tone='green'
          />
          <SummaryCard
            title='Fixos'
            value={summary.fixedEvents}
            subtitle='Base recorrente da folha'
            tone='violet'
          />
          <SummaryCard
            title='Variaveis'
            value={summary.variableEvents}
            subtitle='Lancamentos por competencia'
            tone='blue'
          />
          <SummaryCard
            title='Descontos'
            value={summary.discounts}
            subtitle='Rubricas de desconto ativas e historicas'
            tone='amber'
          />
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
              <div className='lg:col-span-2'>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Buscar
                </label>
                <input
                  type='text'
                  placeholder='Buscar por codigo, nome ou categoria'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                />
              </div>

              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Tipo
                </label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                >
                  <option value='TODOS'>Todos</option>
                  <option value='ATIVO'>Ativos</option>
                  <option value='INATIVO'>Inativos</option>
                </select>
              </div>

              <div className='lg:col-span-2'>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Incidencia
                </label>
                <select
                  value={incidenceFilter}
                  onChange={(event) => setIncidenceFilter(event.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                >
                  <option value='TODOS'>Todas</option>
                  <option value='INSS'>Com INSS</option>
                  <option value='FGTS'>Com FGTS</option>
                  <option value='IRRF'>Com IRRF</option>
                </select>
              </div>

              <div className='lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-700'>
                  Uso operacional
                </p>
                <p className='mt-1 text-sm text-slate-500'>
                  Os eventos desta tela alimentam o processamento da folha,
                  compoem os lancamentos da competencia e determinam as bases de
                  encargos.
                </p>
              </div>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
              Categorias mais usadas
            </p>
            <h3 className='mt-2 text-xl font-bold text-slate-900'>
              Governanca por grupo
            </h3>

            <div className='mt-5 space-y-3'>
              {Object.entries(groupedCategories).length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500'>
                  Nenhuma categoria encontrada nos filtros atuais.
                </div>
              ) : (
                Object.entries(groupedCategories)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([category, count]) => (
                    <div
                      key={category}
                      className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'
                    >
                      <div>
                        <p className='font-semibold text-slate-800'>
                          {category}
                        </p>
                        <p className='mt-1 text-xs text-slate-500'>
                          Rubricas cadastradas
                        </p>
                      </div>

                      <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700'>
                        {count}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
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

            <button
              type='button'
              onClick={() => setActiveTab('cards')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'cards'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Visao detalhada
            </button>
          </div>
        </div>

        {activeTab === 'list' && renderEventList()}
        {activeTab === 'cards' && renderEventCards()}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeDrawer}
          />

          <div className='relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
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
                      Catalogo governado
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingEvent ? 'Editar evento' : 'Novo evento'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure a rubrica com tipo, incidencia e comportamento
                      padrao para o processamento da competencia.
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

            <form onSubmit={handleSave} className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Codigo
                        </label>
                        <input
                          type='text'
                          name='code'
                          value={formData.code}
                          onChange={handleChange}
                          disabled={Boolean(editingEvent?.isSystem)}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-500 disabled:bg-slate-100'
                          placeholder='EX: BONUS'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Nome
                        </label>
                        <input
                          type='text'
                          name='name'
                          value={formData.name}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Ex: Bonus de performance'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tipo
                        </label>
                        <select
                          name='type'
                          value={formData.type}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {typeOptions
                            .filter((option) => option.value !== 'TODOS')
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Categoria
                        </label>
                        <input
                          type='text'
                          name='category'
                          value={formData.category}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Ex: VARIAVEIS'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tipo de calculo
                        </label>
                        <select
                          name='calculationType'
                          value={formData.calculationType}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {calculationTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Valor padrao
                        </label>
                        <input
                          type='number'
                          step='0.01'
                          name='defaultValue'
                          value={formData.defaultValue}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Quantidade padrao
                        </label>
                        <input
                          type='number'
                          step='0.01'
                          name='defaultQuantity'
                          value={formData.defaultQuantity}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Valor unitario padrao
                        </label>
                        <input
                          type='number'
                          step='0.01'
                          name='defaultUnitValue'
                          value={formData.defaultUnitValue}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Descricao
                        </label>
                        <textarea
                          name='description'
                          value={formData.description}
                          onChange={handleChange}
                          rows='4'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Descreva como este evento deve ser usado no processamento da folha.'
                        />
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Incidencias e comportamento
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Defina reflexos sobre encargos e se a rubrica entra como
                        fixa ou variavel.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <ToggleField
                        name='incidenceINSS'
                        checked={formData.incidenceINSS}
                        onChange={handleChange}
                        label='Incide em INSS'
                      />
                      <ToggleField
                        name='incidenceFGTS'
                        checked={formData.incidenceFGTS}
                        onChange={handleChange}
                        label='Incide em FGTS'
                      />
                      <ToggleField
                        name='incidenceIRRF'
                        checked={formData.incidenceIRRF}
                        onChange={handleChange}
                        label='Incide em IRRF'
                      />
                      <ToggleField
                        name='isFixed'
                        checked={formData.isFixed}
                        onChange={handleChange}
                        label='Evento fixo'
                      />
                      <ToggleField
                        name='isVariable'
                        checked={formData.isVariable}
                        onChange={handleChange}
                        label='Evento variavel'
                      />
                      <ToggleField
                        name='isActive'
                        checked={formData.isActive}
                        onChange={handleChange}
                        label='Evento ativo'
                      />
                    </div>
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
                    {saving
                      ? editingEvent
                        ? 'Salvando...'
                        : 'Criando...'
                      : editingEvent
                        ? 'Salvar evento'
                        : 'Criar evento'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const initialEventSummary = () => ({
  totalEvents: 0,
  activeEvents: 0,
  inactiveEvents: 0,
  fixedEvents: 0,
  variableEvents: 0,
  provents: 0,
  discounts: 0,
  informative: 0,
});

const ToggleField = ({ name, checked, onChange, label }) => (
  <label className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700'>
    <input
      type='checkbox'
      name={name}
      checked={checked}
      onChange={onChange}
      className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
    />
    {label}
  </label>
);

const IncidenceBadge = ({ label, active }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border border-slate-200 bg-white text-slate-400'
    }`}
  >
    {label}
  </span>
);

const ActionButton = ({ label, tone = 'blue', onClick }) => {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tones[tone]}`}
    >
      {label}
    </button>
  );
};

const MiniActionButton = ({ label, tone = 'blue', onClick }) => {
  const tones = {
    blue: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
    amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
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
};

export default PayrollEvents;
