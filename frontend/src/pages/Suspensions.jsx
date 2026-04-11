import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const initialForm = {
  employeeId: '',
  employeeName: '',
  title: '',
  startDate: '',
  endDate: '',
  status: 'Registrada',
  description: '',
};

const Suspensions = () => {
  const [employees, setEmployees] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchEmployees();
    const saved = localStorage.getItem('suspensions');
    setSuspensions(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem('suspensions', JSON.stringify(suspensions));
  }, [suspensions]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await axios.get('http://localhost:3000/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeId') {
      const emp = employees.find((employee) => String(employee.id) === value);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        employeeName: emp?.fullName || emp?.name || '',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.title || !formData.startDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);

      const newItem = {
        id: Date.now(),
        ...formData,
        employeeId: Number(formData.employeeId),
        createdAt: new Date().toISOString(),
      };

      setSuspensions((prev) => [newItem, ...prev]);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm('Deseja excluir esta suspensão?');
    if (!confirmDelete) return;
    setSuspensions((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = useMemo(() => {
    return suspensions.filter((item) => {
      const matchesSearch = `
        ${item.employeeName || ''}
        ${item.title || ''}
        ${item.description || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'Todos' ||
        (item.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [suspensions, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suspensions.length,
      registered: suspensions.filter((s) => s.status === 'Registrada').length,
      active: suspensions.filter((s) => s.status === 'Ativa').length,
      finished: suspensions.filter((s) => s.status === 'Finalizada').length,
    };
  }, [suspensions]);

  const formatDate = (date) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('pt-BR');
  };

  const getStatusClasses = (status) => {
    const normalized = (status || '').toLowerCase();

    if (normalized === 'registrada') {
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    }

    if (normalized === 'ativa') {
      return 'border border-red-200 bg-red-50 text-red-700';
    }

    if (normalized === 'finalizada') {
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    return 'border border-slate-200 bg-slate-100 text-slate-700';
  };

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>Suspensões</h1>
            <p className='mt-1 text-slate-500'>
              Registro histórico de medidas disciplinares e suspensões.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Nova suspensão
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.total}
            </h2>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Registradas</p>
            <h2 className='mt-2 text-3xl font-bold text-amber-600'>
              {stats.registered}
            </h2>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Ativas</p>
            <h2 className='mt-2 text-3xl font-bold text-red-600'>
              {stats.active}
            </h2>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Finalizadas</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {stats.finished}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                type='text'
                placeholder='Buscar por colaborador, título ou descrição'
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
                <option value='Todos'>Todos</option>
                <option value='Registrada'>Registrada</option>
                <option value='Ativa'>Ativa</option>
                <option value='Finalizada'>Finalizada</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
            Nenhuma suspensão encontrada.
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            {filtered.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
              >
                <div className='flex flex-col gap-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h3 className='text-xl font-bold text-slate-800'>
                        {item.title}
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        {item.employeeName}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Início</p>
                      <p className='mt-1 font-semibold text-slate-800'>
                        {formatDate(item.startDate)}
                      </p>
                    </div>

                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Fim</p>
                      <p className='mt-1 font-semibold text-slate-800'>
                        {formatDate(item.endDate)}
                      </p>
                    </div>
                  </div>

                  {item.description ? (
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Descrição</p>
                      <p className='mt-1 text-sm font-medium text-slate-700'>
                        {item.description}
                      </p>
                    </div>
                  ) : null}

                  <div className='flex flex-wrap gap-2 pt-2'>
                    <button
                      type='button'
                      onClick={() => handleDelete(item.id)}
                      className='rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100'
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                      Cadastro de suspensão
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Nova suspensão
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre uma suspensão disciplinar.
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
              onSubmit={handleCreate}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
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
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Título
                        </label>
                        <input
                          name='title'
                          value={formData.title}
                          onChange={handleChange}
                          placeholder='Ex: Suspensão por falta grave'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data inicial
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
                          Data final
                        </label>
                        <input
                          type='date'
                          name='endDate'
                          value={formData.endDate}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

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
                          <option value='Registrada'>Registrada</option>
                          <option value='Ativa'>Ativa</option>
                          <option value='Finalizada'>Finalizada</option>
                        </select>
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Descrição
                        </label>
                        <textarea
                          name='description'
                          value={formData.description}
                          onChange={handleChange}
                          rows='4'
                          placeholder='Detalhes sobre a suspensão'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>
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
                    {saving ? 'Salvando...' : 'Cadastrar suspensão'}
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

export default Suspensions;
