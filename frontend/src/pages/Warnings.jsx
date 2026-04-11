import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const initialForm = {
  employeeId: '',
  employeeName: '',
  title: '',
  type: 'Advertência verbal',
  date: '',
  status: 'Registrada',
  description: '',
};

const Warnings = () => {
  const [employees, setEmployees] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchEmployees();
    loadWarnings();
  }, []);

  useEffect(() => {
    localStorage.setItem('warnings', JSON.stringify(warnings));
  }, [warnings]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const res = await axios.get('http://localhost:3000/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadWarnings = () => {
    const saved = localStorage.getItem('warnings');
    setWarnings(saved ? JSON.parse(saved) : []);
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

    if (
      !formData.employeeId ||
      !formData.employeeName ||
      !formData.title ||
      !formData.date
    ) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);

      const newWarning = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };

      setWarnings((prev) => [newWarning, ...prev]);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      'Deseja realmente excluir esta advertência?'
    );

    if (!confirmDelete) return;

    setWarnings((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = useMemo(() => {
    return warnings
      .filter((w) => {
        const matchesSearch = `
          ${w.employeeName || ''}
          ${w.title || ''}
          ${w.type || ''}
          ${w.description || ''}
        `
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === 'Todos' ||
          (w.status || '').toLowerCase() === statusFilter.toLowerCase();

        const matchesType =
          typeFilter === 'Todos' ||
          (w.type || '').toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0) -
          new Date(a.date || a.createdAt || 0)
      );
  }, [warnings, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = warnings.length;
    const registered = warnings.filter(
      (item) => (item.status || '').toLowerCase() === 'registrada'
    ).length;
    const concluded = warnings.filter(
      (item) => (item.status || '').toLowerCase() === 'concluída'
    ).length;
    const formal = warnings.filter(
      (item) => (item.type || '').toLowerCase() === 'advertência formal'
    ).length;

    return {
      total,
      registered,
      concluded,
      formal,
    };
  }, [warnings]);

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

    if (normalized === 'concluída') {
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (normalized === 'analisando') {
      return 'border border-blue-200 bg-blue-50 text-blue-700';
    }

    return 'border border-slate-200 bg-slate-100 text-slate-700';
  };

  const renderOverviewTab = () => {
    if (filtered.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhuma advertência encontrada.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filtered.map((item) => (
          <div
            key={item.id}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
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
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Tipo</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {item.type || '-'}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Data</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {formatDate(item.date)}
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
    );
  };

  const renderListTab = () => {
    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Lista de advertências
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhuma advertência encontrada.
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
                    Título
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Tipo
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Data
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filtered.map((item) => (
                  <tr key={item.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5'>
                      <p className='font-semibold text-slate-800'>
                        {item.employeeName}
                      </p>
                    </td>

                    <td className='px-6 py-5 text-sm font-medium text-slate-700'>
                      {item.title}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {item.type}
                    </td>

                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {formatDate(item.date)}
                    </td>

                    <td className='px-6 py-5'>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className='px-6 py-5'>
                      <div className='flex justify-center'>
                        <button
                          type='button'
                          onClick={() => handleDelete(item.id)}
                          className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100'
                        >
                          Excluir
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
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>Advertências</h1>
            <p className='mt-1 text-slate-500'>
              Controle disciplinar dos colaboradores.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Nova advertência
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de advertências</p>
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
            <p className='text-sm text-slate-500'>Concluídas</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {stats.concluded}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Formais</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.formal}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <div className='lg:col-span-1'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Buscar
              </label>
              <input
                placeholder='Buscar por colaborador, título ou descrição'
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <option value='Analisando'>Analisando</option>
                <option value='Concluída'>Concluída</option>
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='Todos'>Todos</option>
                <option value='Advertência verbal'>Advertência verbal</option>
                <option value='Advertência formal'>Advertência formal</option>
                <option value='Orientação disciplinar'>
                  Orientação disciplinar
                </option>
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
              Visão geral
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

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'list' && renderListTab()}
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
                      Cadastro de advertência
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Nova advertência
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre uma advertência vinculada ao colaborador.
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
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Colaborador
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione o colaborador relacionado à advertência.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5'>
                      <div>
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
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados da advertência
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Informações principais do registro disciplinar.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Título
                        </label>
                        <input
                          name='title'
                          value={formData.title}
                          onChange={handleChange}
                          placeholder='Ex: Advertência por atraso'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
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
                          <option value='Advertência verbal'>
                            Advertência verbal
                          </option>
                          <option value='Advertência formal'>
                            Advertência formal
                          </option>
                          <option value='Orientação disciplinar'>
                            Orientação disciplinar
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data
                        </label>
                        <input
                          type='date'
                          name='date'
                          value={formData.date}
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
                          <option value='Analisando'>Analisando</option>
                          <option value='Concluída'>Concluída</option>
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
                          placeholder='Descreva os detalhes da advertência'
                          rows='5'
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
                    {saving ? 'Salvando...' : 'Cadastrar advertência'}
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

export default Warnings;
