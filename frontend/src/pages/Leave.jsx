import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  employeeName: '',
  type: 'INSS',
  startDate: '',
  endDate: '',
  status: 'Ativo',
  description: '',
};

const mapLeaveFromApi = (item) => {
  return {
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employee?.name || item.employeeName || '',
    type: item.type || 'INSS',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    status: item.status || 'Ativo',
    description: item.description || '',
    createdAt: item.createdAt || '',
  };
};

const Leave = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    loadLeaves();
  }, []);

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

  const loadLeaves = async () => {
    try {
      setLoadingLeaves(true);
      const res = await api.get('/leaves');
      const rawLeaves = res.data?.leaves || [];
      setLeaves(rawLeaves.map(mapLeaveFromApi));
    } catch (error) {
      console.error('Erro ao buscar afastamentos:', error);
      setLeaves([]);
    } finally {
      setLoadingLeaves(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);

      await api.post('/leaves', {
        employeeId: Number(formData.employeeId),
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        description: formData.description,
      });

      await loadLeaves();
      closeDrawer();
    } catch (error) {
      console.error('Erro ao salvar afastamento:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar afastamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Deseja excluir este afastamento?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/leaves/${id}`);
      await loadLeaves();
    } catch (error) {
      console.error('Erro ao excluir afastamento:', error);
      alert(error?.response?.data?.message || 'Erro ao excluir afastamento.');
    }
  };

  const filtered = useMemo(() => {
    return leaves.filter((item) => {
      const matchesSearch = `
        ${item.employeeName || ''}
        ${item.type || ''}
        ${item.description || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'Todos' ||
        (item.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [leaves, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: leaves.length,
      active: leaves.filter((l) => l.status === 'Ativo').length,
      finished: leaves.filter((l) => l.status === 'Finalizado').length,
      inss: leaves.filter((l) => l.type === 'INSS').length,
    };
  }, [leaves]);

  const formatDate = (date) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('pt-BR');
  };

  const getStatusClasses = (status) => {
    const normalized = (status || '').toLowerCase();

    if (normalized === 'ativo') {
      return 'border border-blue-200 bg-blue-50 text-blue-700';
    }

    if (normalized === 'finalizado') {
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
            <h1 className='text-3xl font-bold text-slate-800'>Afastamentos</h1>
            <p className='mt-1 text-slate-500'>
              Controle de INSS, licença-maternidade e licenças especiais.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo afastamento
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
            <p className='text-sm text-slate-500'>Ativos</p>
            <h2 className='mt-2 text-3xl font-bold text-blue-600'>
              {stats.active}
            </h2>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Finalizados</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {stats.finished}
            </h2>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>INSS</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.inss}
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
                placeholder='Buscar por colaborador, tipo ou descrição'
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
                <option value='Ativo'>Ativo</option>
                <option value='Finalizado'>Finalizado</option>
              </select>
            </div>
          </div>
        </div>

        {loadingLeaves ? (
          <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
            Carregando afastamentos...
          </div>
        ) : filtered.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
            Nenhum afastamento encontrado.
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
                        {item.employeeName}
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>{item.type}</p>
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
                      Cadastro de afastamento
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Novo afastamento
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre um afastamento do colaborador.
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
                          <option value='INSS'>INSS</option>
                          <option value='Licença-maternidade'>
                            Licença-maternidade
                          </option>
                          <option value='Licença gala'>Licença gala</option>
                          <option value='Licença nojo'>Licença nojo</option>
                        </select>
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
                          <option value='Ativo'>Ativo</option>
                          <option value='Finalizado'>Finalizado</option>
                        </select>
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

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Descrição
                        </label>
                        <textarea
                          name='description'
                          value={formData.description}
                          onChange={handleChange}
                          rows='4'
                          placeholder='Informações adicionais sobre o afastamento'
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
                    {saving ? 'Salvando...' : 'Cadastrar afastamento'}
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

export default Leave;
