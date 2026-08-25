import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const scheduleTypeStyles = {
  FERIADO: 'border border-rose-200 bg-rose-50 text-rose-700',
  EVENTO: 'border border-amber-200 bg-amber-50 text-amber-700',
  PLANTAO: 'border border-violet-200 bg-violet-50 text-violet-700',
  ESCALA_FIXA: 'border border-sky-200 bg-sky-50 text-sky-700',
  ESCALA_EXTRA: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
  FINAL_DE_SEMANA: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  CLIENTE: 'border border-cyan-200 bg-cyan-50 text-cyan-700',
  OUTRO: 'border border-slate-200 bg-slate-100 text-slate-700',
};

const scheduleStatusStyles = {
  RASCUNHO: 'border border-slate-200 bg-slate-100 text-slate-700',
  PUBLICADA: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELADA: 'border border-rose-200 bg-rose-50 text-rose-700',
  CONCLUIDA: 'border border-blue-200 bg-blue-50 text-blue-700',
};

const assignmentStatusStyles = {
  ESCALADO: 'border border-slate-200 bg-slate-100 text-slate-700',
  CONFIRMADO: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  AUSENTE: 'border border-rose-200 bg-rose-50 text-rose-700',
  SUBSTITUIDO: 'border border-amber-200 bg-amber-50 text-amber-700',
  CANCELADO: 'border border-slate-300 bg-slate-50 text-slate-500',
};

const initialForm = {
  name: '',
  scheduleType: 'FERIADO',
  status: 'RASCUNHO',
  startDate: '',
  endDate: '',
  defaultStartTime: '08:00',
  defaultEndTime: '18:00',
  breakMinutes: '60',
  location: '',
  clientName: '',
  specialDateId: '',
  notes: '',
  assignments: [],
};

const buildEmptyAssignment = (base = {}) => ({
  employeeId: '',
  workDate: base.startDate || '',
  startTime: base.defaultStartTime || '08:00',
  endTime: base.defaultEndTime || '18:00',
  breakMinutes: base.breakMinutes || '60',
  roleNote: '',
  status: 'ESCALADO',
});

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const formatPeriod = (schedule) => {
  if (!schedule?.startDate) return '-';
  const startDate = formatDate(schedule.startDate);
  const endDate = schedule.endDate ? formatDate(schedule.endDate) : startDate;
  return startDate === endDate ? startDate : `${startDate} ate ${endDate}`;
};

const Badge = ({ label, tone }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
    {label}
  </span>
);

const StatCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className='text-sm opacity-75'>{title}</p>
      <h2 className='mt-2 text-3xl font-black'>{value}</h2>
      <p className='mt-2 text-sm opacity-75'>{subtitle}</p>
    </div>
  );
};

function WorkSchedules() {
  const { hasPermission } = useAuthSession();
  const canRead = hasPermission('work_schedules.read');
  const canCreate = hasPermission('work_schedules.create');
  const canUpdate = hasPermission('work_schedules.update');
  const canPublish = hasPermission('work_schedules.publish');
  const canCancel = hasPermission('work_schedules.cancel');
  const canAssign = hasPermission('work_schedules.assign');

  const [filters, setFilters] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    type: 'TODOS',
    status: 'TODOS',
    employeeId: 'TODOS',
    department: 'TODOS',
    clientName: 'TODOS',
    specialDateId: 'TODOS',
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({
    employees: [],
    departments: [],
    scheduleTypes: [],
    statuses: [],
    assignmentStatuses: [],
    specialDates: [],
    clients: [],
  });
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState({
    activeSchedules: 0,
    upcomingSchedules: 0,
    employeesScheduled: 0,
    holidaySchedules: 0,
    conflictsDetected: 0,
    dutySchedules: 0,
  });
  const [timeline, setTimeline] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 4 }).map((_, index) => currentYear + index - 1);
  }, []);

  const loadOptions = async () => {
    const response = await api.get('/work-schedules/options');
    setOptions(
      response.data || {
        employees: [],
        departments: [],
        scheduleTypes: [],
        statuses: [],
        assignmentStatuses: [],
        specialDates: [],
        clients: [],
      }
    );
  };

  const loadSchedules = async () => {
    const response = await api.get('/work-schedules', { params: filters });
    setSchedules(response.data?.schedules || []);
    setSummary(
      response.data?.summary || {
        activeSchedules: 0,
        upcomingSchedules: 0,
        employeesScheduled: 0,
        holidaySchedules: 0,
        conflictsDetected: 0,
        dutySchedules: 0,
      }
    );
    setTimeline(response.data?.timeline || []);
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadOptions(), loadSchedules()]);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar o modulo de Escala.'
      );
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    refreshData();
  }, [canRead, filters.month, filters.year, filters.type, filters.status, filters.employeeId, filters.department, filters.clientName, filters.specialDateId, filters.search]);

  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setForm({
      ...initialForm,
      startDate: today,
      endDate: today,
      assignments: [buildEmptyAssignment({ startDate: today })],
    });
  };

  const openCreateDrawer = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDrawer = async (scheduleId) => {
    try {
      const response = await api.get(`/work-schedules/${scheduleId}`);
      const schedule = response.data?.schedule;
      setEditingId(schedule.id);
      setForm({
        name: schedule.name || '',
        scheduleType: schedule.scheduleType || 'FERIADO',
        status: schedule.status || 'RASCUNHO',
        startDate: schedule.startDate ? String(schedule.startDate).slice(0, 10) : '',
        endDate: schedule.endDate ? String(schedule.endDate).slice(0, 10) : '',
        defaultStartTime: schedule.defaultStartTime || '08:00',
        defaultEndTime: schedule.defaultEndTime || '18:00',
        breakMinutes:
          schedule.breakMinutes === undefined || schedule.breakMinutes === null
            ? '60'
            : String(schedule.breakMinutes),
        location: schedule.location || '',
        clientName: schedule.clientName || '',
        specialDateId: schedule.specialDateId ? String(schedule.specialDateId) : '',
        notes: schedule.notes || '',
        assignments: (schedule.assignments || []).map((assignment) => ({
          assignmentId: assignment.id,
          employeeId: String(assignment.employeeId),
          workDate: String(assignment.workDate).slice(0, 10),
          startTime: assignment.startTime || '',
          endTime: assignment.endTime || '',
          breakMinutes:
            assignment.breakMinutes === undefined || assignment.breakMinutes === null
              ? ''
              : String(assignment.breakMinutes),
          roleNote: assignment.roleNote || '',
          status: assignment.status || 'ESCALADO',
        })),
      });
      setIsFormOpen(true);
    } catch (error) {
      console.error('Erro ao carregar escala:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar a escala para edicao.'
      );
    }
  };

  const openDetailsDrawer = async (scheduleId) => {
    try {
      const response = await api.get(`/work-schedules/${scheduleId}`);
      setSelectedSchedule(response.data?.schedule || null);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhe da escala:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel carregar o detalhe da escala.'
      );
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      };

      if (name === 'startDate') {
        nextForm.assignments = current.assignments.map((assignment, index) =>
          index === 0 && !assignment.workDate
            ? { ...assignment, workDate: value }
            : assignment
        );
      }

      return nextForm;
    });
  };

  const handleAssignmentChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      assignments: current.assignments.map((assignment, assignmentIndex) =>
        assignmentIndex === index
          ? { ...assignment, [field]: value }
          : assignment
      ),
    }));
  };

  const addAssignmentRow = () => {
    setForm((current) => ({
      ...current,
      assignments: [
        ...current.assignments,
        buildEmptyAssignment({
          startDate: current.startDate,
          defaultStartTime: current.defaultStartTime,
          defaultEndTime: current.defaultEndTime,
          breakMinutes: current.breakMinutes,
        }),
      ],
    }));
  };

  const removeAssignmentRow = (index) => {
    setForm((current) => ({
      ...current,
      assignments: current.assignments.filter((_, assignmentIndex) => assignmentIndex !== index),
    }));
  };

  const applyDefaultTimesToAll = () => {
    setForm((current) => ({
      ...current,
      assignments: current.assignments.map((assignment) => ({
        ...assignment,
        workDate: assignment.workDate || current.startDate,
        startTime: current.defaultStartTime,
        endTime: current.defaultEndTime,
        breakMinutes: current.breakMinutes,
      })),
    }));
  };

  const buildPayload = () => ({
    name: form.name,
    scheduleType: form.scheduleType,
    status: form.status,
    startDate: form.startDate,
    endDate: form.endDate,
    defaultStartTime: form.defaultStartTime || null,
    defaultEndTime: form.defaultEndTime || null,
    breakMinutes: form.breakMinutes === '' ? null : Number(form.breakMinutes),
    location: form.location || null,
    clientName: form.clientName || null,
    specialDateId: form.specialDateId ? Number(form.specialDateId) : null,
    notes: form.notes || null,
    assignments: form.assignments
      .filter((assignment) => assignment.employeeId && assignment.workDate)
      .map((assignment) => ({
        employeeId: Number(assignment.employeeId),
        workDate: assignment.workDate,
        startTime: assignment.startTime || null,
        endTime: assignment.endTime || null,
        breakMinutes:
          assignment.breakMinutes === '' ? null : Number(assignment.breakMinutes),
        roleNote: assignment.roleNote || null,
        status: assignment.status || 'ESCALADO',
      })),
  });

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.assignments.some((assignment) => assignment.employeeId && assignment.workDate)) {
      alert('Adicione pelo menos um colaborador escalado antes de salvar.');
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (editingId) {
        await api.put(`/work-schedules/${editingId}`, payload);
      } else {
        await api.post('/work-schedules', payload);
      }

      setIsFormOpen(false);
      resetForm();
      await refreshData();
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      alert(
        error?.response?.data?.message || 'Nao foi possivel salvar a escala.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (scheduleId, status) => {
    try {
      setStatusUpdating(true);
      await api.patch(`/work-schedules/${scheduleId}/status`, { status });
      if (selectedSchedule?.id === scheduleId) {
        await openDetailsDrawer(scheduleId);
      }
      await refreshData();
    } catch (error) {
      console.error('Erro ao atualizar status da escala:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel atualizar o status da escala.'
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    const confirmed = window.confirm(
      'Deseja cancelar e arquivar esta escala? A trilha ficara registrada em auditoria.'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/work-schedules/${scheduleId}`);
      setIsDetailsOpen(false);
      await refreshData();
    } catch (error) {
      console.error('Erro ao arquivar escala:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel arquivar a escala.'
      );
    }
  };

  const handleDuplicate = async (scheduleId) => {
    try {
      await api.post(`/work-schedules/${scheduleId}/duplicate`);
      await refreshData();
    } catch (error) {
      console.error('Erro ao duplicar escala:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel duplicar a escala.'
      );
    }
  };

  if (!canRead) {
    return (
      <div className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
        <div className='rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.25em] text-slate-400'>
            Escala
          </p>
          <h1 className='mt-3 text-3xl font-black text-slate-900'>
            Acesso restrito
          </h1>
          <p className='mt-3 text-sm text-slate-500'>
            Sua conta ainda nao possui permissao para consultar o planejamento de escala.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-8'>
        <section className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-8 py-8 text-white'>
            <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
              <div className='max-w-3xl'>
                <div className='mb-3 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100'>
                  Planejamento operacional
                </div>
                <h1 className='text-4xl font-black tracking-tight'>Escala</h1>
                <p className='mt-3 text-lg text-slate-200'>
                  Planeje feriados, plantoes, eventos e operacoes por cliente com rastreabilidade,
                  horarios individuais e visao clara de conflitos antes da publicacao.
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                {canCreate ? (
                  <button
                    type='button'
                    onClick={openCreateDrawer}
                    className='rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100'
                  >
                    Nova Escala
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className='grid grid-cols-1 gap-4 xl:grid-cols-6'>
          <StatCard
            title='Escalas ativas'
            value={summary.activeSchedules}
            subtitle='Rascunhos e publicadas no recorte atual'
            tone='slate'
          />
          <StatCard
            title='Proximas escalas'
            value={summary.upcomingSchedules}
            subtitle='Programacoes futuras no filtro'
            tone='blue'
          />
          <StatCard
            title='Colaboradores escalados'
            value={summary.employeesScheduled}
            subtitle='Pessoas cobertas no periodo'
            tone='emerald'
          />
          <StatCard
            title='Escalas em feriados'
            value={summary.holidaySchedules}
            subtitle='Planejamento para datas especiais'
            tone='rose'
          />
          <StatCard
            title='Conflitos detectados'
            value={summary.conflictsDetected}
            subtitle='Avisos para revisao antes da publicacao'
            tone='amber'
          />
          <StatCard
            title='Plantoes do mes'
            value={summary.dutySchedules}
            subtitle='Cobertura especifica do periodo'
            tone='violet'
          />
        </section>

        <section className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='grid grid-cols-1 gap-5 xl:grid-cols-4'>
            <div className='xl:col-span-2'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar escala, local, cliente ou colaborador
              </label>
              <input
                type='text'
                name='search'
                value={filters.search}
                onChange={handleFilterChange}
                placeholder='Ex.: Natal, cliente, operacao, colaborador...'
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Mes</label>
              <select
                name='month'
                value={filters.month}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {Array.from({ length: 12 }).map((_, index) => (
                  <option key={String(index + 1)} value={String(index + 1)}>
                    {String(index + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Ano</label>
              <select
                name='year'
                value={filters.year}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {yearOptions.map((year) => (
                  <option key={String(year)} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Tipo</label>
              <select
                name='type'
                value={filters.type}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.scheduleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Status</label>
              <select
                name='status'
                value={filters.status}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Colaborador</label>
              <select
                name='employeeId'
                value={filters.employeeId}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.employees.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Departamento</label>
              <select
                name='department'
                value={filters.department}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Cliente / local</label>
              <select
                name='clientName'
                value={filters.clientName}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {options.clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Data especial</label>
              <select
                name='specialDateId'
                value={filters.specialDateId}
                onChange={handleFilterChange}
                className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todas</option>
                {options.specialDates.map((specialDate) => (
                  <option key={specialDate.id} value={String(specialDate.id)}>
                    {specialDate.name} - {formatDate(specialDate.date)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className='grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='rounded-[2rem] border border-slate-200 bg-white shadow-sm'>
            <div className='flex items-center justify-between border-b border-slate-200 px-6 py-5'>
              <div>
                <h2 className='text-xl font-bold text-slate-900'>Lista de escalas</h2>
                <p className='mt-1 text-sm text-slate-500'>
                  Planejamento por periodo, cliente e data especial.
                </p>
              </div>
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200 text-sm'>
                <thead className='bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  <tr>
                    <th className='px-6 py-4'>Escala</th>
                    <th className='px-6 py-4'>Tipo</th>
                    <th className='px-6 py-4'>Periodo</th>
                    <th className='px-6 py-4'>Equipe</th>
                    <th className='px-6 py-4'>Local / cliente</th>
                    <th className='px-6 py-4'>Status</th>
                    <th className='px-6 py-4'>Conflitos</th>
                    <th className='px-6 py-4 text-right'>Acoes</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100 bg-white'>
                  {loading ? (
                    <tr>
                      <td colSpan='8' className='px-6 py-10 text-center text-slate-500'>
                        Carregando escalas...
                      </td>
                    </tr>
                  ) : schedules.length ? (
                    schedules.map((schedule) => (
                      <tr key={schedule.id} className='align-top'>
                        <td className='px-6 py-5'>
                          <div>
                            <p className='font-semibold text-slate-900'>{schedule.name}</p>
                            <p className='mt-1 text-xs text-slate-500'>
                              {schedule.specialDate?.name || 'Escala operacional'}
                            </p>
                          </div>
                        </td>
                        <td className='px-6 py-5'>
                          <Badge
                            label={schedule.scheduleType}
                            tone={
                              scheduleTypeStyles[schedule.scheduleType] ||
                              scheduleTypeStyles.OUTRO
                            }
                          />
                        </td>
                        <td className='px-6 py-5 text-slate-600'>{formatPeriod(schedule)}</td>
                        <td className='px-6 py-5 text-slate-600'>
                          {schedule.employeesCount} colaborador(es)
                        </td>
                        <td className='px-6 py-5 text-slate-600'>
                          <div>
                            <p>{schedule.location || '-'}</p>
                            <p className='mt-1 text-xs text-slate-500'>
                              {schedule.clientName || 'Sem cliente especifico'}
                            </p>
                          </div>
                        </td>
                        <td className='px-6 py-5'>
                          <Badge
                            label={schedule.status}
                            tone={
                              scheduleStatusStyles[schedule.status] ||
                              scheduleStatusStyles.RASCUNHO
                            }
                          />
                        </td>
                        <td className='px-6 py-5'>
                          {schedule.hasConflicts ? (
                            <Badge label={`${schedule.conflictsCount} aviso(s)`} tone='border border-amber-200 bg-amber-50 text-amber-700' />
                          ) : (
                            <span className='text-slate-400'>Sem alertas</span>
                          )}
                        </td>
                        <td className='px-6 py-5'>
                          <div className='flex justify-end gap-2'>
                            <button
                              type='button'
                              onClick={() => openDetailsDrawer(schedule.id)}
                              className='rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                            >
                              Ver
                            </button>

                            {canUpdate ? (
                              <button
                                type='button'
                                onClick={() => openEditDrawer(schedule.id)}
                                className='rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
                              >
                                Editar
                              </button>
                            ) : null}

                            {canPublish && schedule.status !== 'PUBLICADA' ? (
                              <button
                                type='button'
                                disabled={statusUpdating}
                                onClick={() => handleStatusAction(schedule.id, 'PUBLICADA')}
                                className='rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60'
                              >
                                Publicar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan='8' className='px-6 py-12 text-center text-slate-500'>
                        Nenhuma escala encontrada para os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className='rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='mb-5'>
              <h2 className='text-xl font-bold text-slate-900'>Timeline operacional</h2>
              <p className='mt-1 text-sm text-slate-500'>
                Leitura rapida das escalas por dia com foco em feriados, eventos e plantoes.
              </p>
            </div>

            <div className='space-y-4'>
              {timeline.length ? (
                timeline.slice(0, 12).map((day) => (
                  <div
                    key={day.date}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-400'>
                          {formatDate(day.date)}
                        </p>
                        <p className='mt-1 text-lg font-bold text-slate-900'>
                          {day.schedules.length} escala(s) no dia
                        </p>
                      </div>
                      <Badge
                        label={`${day.employeesCount} colaborador(es)`}
                        tone='border border-blue-200 bg-blue-50 text-blue-700'
                      />
                    </div>

                    <div className='mt-4 space-y-3'>
                      {day.schedules.map((schedule) => (
                        <button
                          type='button'
                          key={schedule.id}
                          onClick={() => openDetailsDrawer(schedule.id)}
                          className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:shadow-sm'
                        >
                          <div className='flex items-center justify-between gap-4'>
                            <div>
                              <p className='font-semibold text-slate-900'>{schedule.name}</p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {schedule.location || '-'} {schedule.clientName ? `• ${schedule.clientName}` : ''}
                              </p>
                            </div>
                            <Badge
                              label={schedule.scheduleType}
                              tone={
                                scheduleTypeStyles[schedule.scheduleType] ||
                                scheduleTypeStyles.OUTRO
                              }
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500'>
                  Ainda nao ha eventos suficientes para montar a timeline do periodo.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isFormOpen ? (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]'
            onClick={() => setIsFormOpen(false)}
          />

          <div className='relative flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700'>
                    Escala operacional
                  </div>
                  <h2 className='text-2xl font-bold text-slate-900'>
                    {editingId ? 'Editar escala' : 'Nova escala'}
                  </h2>
                  <p className='mt-1 text-sm text-slate-500'>
                    Defina o periodo, aplique horario padrao e distribua a equipe com rastreabilidade.
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setIsFormOpen(false)}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  x
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className='flex-1 overflow-y-auto px-6 py-6'>
              <div className='space-y-6'>
                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='grid grid-cols-1 gap-5 xl:grid-cols-3'>
                    <div className='xl:col-span-2'>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Nome da escala
                      </label>
                      <input
                        type='text'
                        name='name'
                        value={form.name}
                        onChange={handleFormChange}
                        placeholder='Ex.: Escala de Natal - Operacao Norte'
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        required
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Tipo
                      </label>
                      <select
                        name='scheduleType'
                        value={form.scheduleType}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      >
                        {options.scheduleTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Data inicial
                      </label>
                      <input
                        type='date'
                        name='startDate'
                        value={form.startDate}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        required
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Data final
                      </label>
                      <input
                        type='date'
                        name='endDate'
                        value={form.endDate}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        required
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Status
                      </label>
                      <select
                        name='status'
                        value={form.status}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      >
                        {options.statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Inicio padrao
                      </label>
                      <input
                        type='time'
                        name='defaultStartTime'
                        value={form.defaultStartTime}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Fim padrao
                      </label>
                      <input
                        type='time'
                        name='defaultEndTime'
                        value={form.defaultEndTime}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Pausa / intervalo (min)
                      </label>
                      <input
                        type='number'
                        min='0'
                        name='breakMinutes'
                        value={form.breakMinutes}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Data especial
                      </label>
                      <select
                        name='specialDateId'
                        value={form.specialDateId}
                        onChange={handleFormChange}
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      >
                        <option value=''>Sem data especial</option>
                        {options.specialDates.map((specialDate) => (
                          <option key={specialDate.id} value={String(specialDate.id)}>
                            {specialDate.name} - {formatDate(specialDate.date)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Local
                      </label>
                      <input
                        type='text'
                        name='location'
                        value={form.location}
                        onChange={handleFormChange}
                        placeholder='Ex.: Base central, unidade, canteiro'
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Cliente / empresa atendida
                      </label>
                      <input
                        type='text'
                        name='clientName'
                        value={form.clientName}
                        onChange={handleFormChange}
                        placeholder='Ex.: Cliente XPTO'
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>

                    <div className='xl:col-span-3'>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Observacoes
                      </label>
                      <textarea
                        rows='4'
                        name='notes'
                        value={form.notes}
                        onChange={handleFormChange}
                        placeholder='Contexto da operacao, alinhamentos, cobertura de feriado, observacoes do plantao...'
                        className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                      />
                    </div>
                  </div>
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
                    <div>
                      <h3 className='text-lg font-bold text-slate-900'>
                        Colaboradores escalados
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Monte a equipe, ajuste horarios individuais e revise conflitos na abertura do detalhe.
                      </p>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={applyDefaultTimesToAll}
                        className='rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Aplicar horario padrao
                      </button>
                      {canAssign || canCreate || canUpdate ? (
                        <button
                          type='button'
                          onClick={addAssignmentRow}
                          className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800'
                        >
                          Adicionar colaborador
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className='space-y-4'>
                    {form.assignments.map((assignment, index) => (
                      <div
                        key={`${assignment.assignmentId || 'new'}-${index}`}
                        className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                      >
                        <div className='grid grid-cols-1 gap-4 xl:grid-cols-6'>
                          <div className='xl:col-span-2'>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Colaborador
                            </label>
                            <select
                              value={assignment.employeeId}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'employeeId', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                              required
                            >
                              <option value=''>Selecionar colaborador</option>
                              {options.employees.map((employee) => (
                                <option key={employee.id} value={String(employee.id)}>
                                  {employee.name} - {employee.department}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Data
                            </label>
                            <input
                              type='date'
                              value={assignment.workDate}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'workDate', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                              required
                            />
                          </div>

                          <div>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Inicio
                            </label>
                            <input
                              type='time'
                              value={assignment.startTime}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'startTime', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            />
                          </div>

                          <div>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Fim
                            </label>
                            <input
                              type='time'
                              value={assignment.endTime}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'endTime', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            />
                          </div>

                          <div>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Pausa
                            </label>
                            <input
                              type='number'
                              min='0'
                              value={assignment.breakMinutes}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'breakMinutes', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            />
                          </div>

                          <div className='xl:col-span-2'>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Funcao / observacao
                            </label>
                            <input
                              type='text'
                              value={assignment.roleNote}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'roleNote', event.target.value)
                              }
                              placeholder='Ex.: lider de plantao, cobertura externa'
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            />
                          </div>

                          <div>
                            <label className='mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                              Status individual
                            </label>
                            <select
                              value={assignment.status}
                              onChange={(event) =>
                                handleAssignmentChange(index, 'status', event.target.value)
                              }
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            >
                              {options.assignmentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className='flex items-end justify-end'>
                            <button
                              type='button'
                              onClick={() => removeAssignmentRow(index)}
                              className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className='sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 pt-6'>
                <button
                  type='button'
                  onClick={() => setIsFormOpen(false)}
                  className='rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {saving ? 'Salvando escala...' : 'Salvar escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDetailsOpen && selectedSchedule ? (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]'
            onClick={() => setIsDetailsOpen(false)}
          />

          <div className='relative flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 flex flex-wrap items-center gap-2'>
                    <Badge
                      label={selectedSchedule.scheduleType}
                      tone={
                        scheduleTypeStyles[selectedSchedule.scheduleType] ||
                        scheduleTypeStyles.OUTRO
                      }
                    />
                    <Badge
                      label={selectedSchedule.status}
                      tone={
                        scheduleStatusStyles[selectedSchedule.status] ||
                        scheduleStatusStyles.RASCUNHO
                      }
                    />
                    {selectedSchedule.hasConflicts ? (
                      <Badge
                        label={`${selectedSchedule.conflictsCount} conflito(s)`}
                        tone='border border-amber-200 bg-amber-50 text-amber-700'
                      />
                    ) : null}
                  </div>
                  <h2 className='text-2xl font-bold text-slate-900'>
                    {selectedSchedule.name}
                  </h2>
                  <p className='mt-1 text-sm text-slate-500'>
                    {formatPeriod(selectedSchedule)} • {selectedSchedule.location || 'Sem local definido'}
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setIsDetailsOpen(false)}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  x
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-6'>
              <div className='space-y-6'>
                <section className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                  <StatCard
                    title='Equipe escalada'
                    value={selectedSchedule.employeesCount}
                    subtitle='Colaboradores envolvidos'
                    tone='slate'
                  />
                  <StatCard
                    title='Alocacoes'
                    value={selectedSchedule.assignmentsCount}
                    subtitle='Lancamentos individuais'
                    tone='blue'
                  />
                  <StatCard
                    title='Conflitos'
                    value={selectedSchedule.conflictsCount}
                    subtitle='Alertas operacionais'
                    tone='amber'
                  />
                  <StatCard
                    title='Ultima atualizacao'
                    value={formatDate(selectedSchedule.updatedAt)}
                    subtitle='Revisao mais recente'
                    tone='violet'
                  />
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                    <div>
                      <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                        Local / cliente
                      </p>
                      <p className='mt-2 text-base font-semibold text-slate-900'>
                        {selectedSchedule.location || '-'}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {selectedSchedule.clientName || 'Sem cliente especifico'}
                      </p>
                    </div>

                    <div>
                      <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                        Data especial
                      </p>
                      <p className='mt-2 text-base font-semibold text-slate-900'>
                        {selectedSchedule.specialDate?.name || 'Escala manual'}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {selectedSchedule.specialDate?.date
                          ? formatDate(selectedSchedule.specialDate.date)
                          : 'Sem data especial vinculada'}
                      </p>
                    </div>
                  </div>

                  <div className='mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600'>
                    {selectedSchedule.notes || 'Sem observacoes adicionais para esta escala.'}
                  </div>

                  <div className='mt-5 flex flex-wrap gap-3'>
                    {canUpdate ? (
                      <button
                        type='button'
                        onClick={() => {
                          setIsDetailsOpen(false);
                          openEditDrawer(selectedSchedule.id);
                        }}
                        className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Editar escala
                      </button>
                    ) : null}

                    {canPublish && selectedSchedule.status !== 'PUBLICADA' ? (
                      <button
                        type='button'
                        disabled={statusUpdating}
                        onClick={() => handleStatusAction(selectedSchedule.id, 'PUBLICADA')}
                        className='rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60'
                      >
                        Publicar
                      </button>
                    ) : null}

                    {canCancel && selectedSchedule.status !== 'CANCELADA' ? (
                      <button
                        type='button'
                        disabled={statusUpdating}
                        onClick={() => handleStatusAction(selectedSchedule.id, 'CANCELADA')}
                        className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60'
                      >
                        Cancelar
                      </button>
                    ) : null}

                    {canCreate ? (
                      <button
                        type='button'
                        onClick={() => handleDuplicate(selectedSchedule.id)}
                        className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Duplicar
                      </button>
                    ) : null}

                    {canCancel ? (
                      <button
                        type='button'
                        onClick={() => handleDelete(selectedSchedule.id)}
                        className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Arquivar
                      </button>
                    ) : null}
                  </div>
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
                  <div className='border-b border-slate-200 px-6 py-5'>
                    <h3 className='text-lg font-bold text-slate-900'>Equipe escalada</h3>
                    <p className='mt-1 text-sm text-slate-500'>
                      Horarios individuais, status por colaborador e conflitos detectados.
                    </p>
                  </div>

                  <div className='space-y-4 px-6 py-6'>
                    {(selectedSchedule.assignments || []).length ? (
                      selectedSchedule.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                        >
                          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                            <div>
                              <div className='flex flex-wrap items-center gap-2'>
                                <p className='text-base font-bold text-slate-900'>
                                  {assignment.employee?.name || 'Colaborador'}
                                </p>
                                <Badge
                                  label={assignment.status}
                                  tone={
                                    assignmentStatusStyles[assignment.status] ||
                                    assignmentStatusStyles.ESCALADO
                                  }
                                />
                              </div>
                              <div className='mt-2 flex flex-wrap gap-4 text-sm text-slate-500'>
                                <span>{formatDate(assignment.workDate)}</span>
                                <span>
                                  {assignment.startTime || '--:--'} as {assignment.endTime || '--:--'}
                                </span>
                                <span>Pausa {assignment.breakMinutes ?? 0} min</span>
                                <span>{assignment.employee?.department || '-'}</span>
                              </div>
                              {assignment.roleNote ? (
                                <p className='mt-2 text-sm text-slate-600'>{assignment.roleNote}</p>
                              ) : null}
                            </div>

                            <div className='min-w-[280px] space-y-2'>
                              {(assignment.conflicts || []).length ? (
                                assignment.conflicts.map((conflict, index) => (
                                  <div
                                    key={`${assignment.id}-${conflict.code}-${index}`}
                                    className='rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'
                                  >
                                    {conflict.message}
                                  </div>
                                ))
                              ) : (
                                <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                                  Sem conflitos para este colaborador.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500'>
                        Nenhum colaborador escalado nesta programacao.
                      </div>
                    )}
                  </div>
                </section>

                <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                    Trilha operacional
                  </p>
                  <div className='mt-3 grid grid-cols-1 gap-4 md:grid-cols-3 text-sm text-slate-600'>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='font-semibold text-slate-900'>Criada por</p>
                      <p className='mt-2'>{selectedSchedule.createdByUser?.name || 'Sistema interno'}</p>
                    </div>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='font-semibold text-slate-900'>Criada em</p>
                      <p className='mt-2'>{formatDateTime(selectedSchedule.createdAt)}</p>
                    </div>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='font-semibold text-slate-900'>Atualizada em</p>
                      <p className='mt-2'>{formatDateTime(selectedSchedule.updatedAt)}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default WorkSchedules;
