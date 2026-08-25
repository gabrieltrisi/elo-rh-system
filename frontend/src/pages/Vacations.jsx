import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  acquisitionPeriod: '',
  startDate: '',
  endDate: '',
  days: '',
  status: 'PENDENTE',
};

function Vacations() {
  const [vacations, setVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [vacationToDelete, setVacationToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('lista');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [employeeFilter, setEmployeeFilter] = useState('TODOS');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingVacations, setLoadingVacations] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    fetchVacations();
    fetchEmployees();
  }, []);

  const fetchVacations = async () => {
    try {
      setLoadingVacations(true);
      const response = await api.get('/vacations');
      setVacations(
        Array.isArray(response.data?.vacations) ? response.data.vacations : []
      );
    } catch (error) {
      console.error('VACATIONS FETCH ERROR:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar férias');
      setVacations([]);
    } finally {
      setLoadingVacations(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await api.get('/employees');
      setEmployees(
        Array.isArray(response.data?.employees) ? response.data.employees : []
      );
    } catch (error) {
      console.error('EMPLOYEES FETCH ERROR:', error);
      toast.error(
        error.response?.data?.message || 'Erro ao carregar colaboradores'
      );
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setIsCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    resetForm();
    setIsCreateDrawerOpen(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEdit = (vacation) => {
    setEditingId(vacation.id);
    setForm({
      employeeId: String(vacation.employeeId || ''),
      acquisitionPeriod: vacation.acquisitionPeriod || '',
      startDate: vacation.startDate ? vacation.startDate.split('T')[0] : '',
      endDate: vacation.endDate ? vacation.endDate.split('T')[0] : '',
      days: String(vacation.days || ''),
      status: vacation.status || 'PENDENTE',
    });
    setIsCreateDrawerOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.employeeId ||
      !form.acquisitionPeriod ||
      !form.startDate ||
      !form.endDate ||
      !form.days
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const payload = {
      employeeId: Number(form.employeeId),
      acquisitionPeriod: form.acquisitionPeriod.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      days: Number(form.days),
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/vacations/${editingId}`, payload);
        toast.success('Férias atualizadas com sucesso!');
      } else {
        await api.post('/vacations', payload);
        toast.success('Férias cadastradas com sucesso!');
      }

      resetForm();
      setIsCreateDrawerOpen(false);
      await fetchVacations();
      setActiveTab('lista');
    } catch (error) {
      console.error('VACATION SUBMIT ERROR:', error);
      toast.error(
        error.response?.data?.message ||
          `Erro ao ${editingId ? 'atualizar' : 'cadastrar'} férias`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vacationToDelete) return;

    try {
      await api.delete(`/vacations/${vacationToDelete.id}`);
      toast.success('Férias excluídas com sucesso!');

      if (editingId === vacationToDelete.id) {
        resetForm();
      }

      setVacationToDelete(null);
      await fetchVacations();
    } catch (error) {
      console.error('VACATION DELETE ERROR:', error);
      toast.error(error.response?.data?.message || 'Erro ao excluir férias');
    }
  };

  const filteredVacations = useMemo(() => {
    const term = search.toLowerCase();

    return vacations.filter((vacation) => {
      const employeeName =
        vacation.employee?.name?.toLowerCase() ||
        vacation.employee?.fullName?.toLowerCase() ||
        '';
      const acquisition = vacation.acquisitionPeriod?.toLowerCase() || '';
      const status = vacation.status?.toLowerCase() || '';

      const matchesSearch =
        employeeName.includes(term) ||
        acquisition.includes(term) ||
        status.includes(term);

      const matchesStatus =
        statusFilter === 'TODOS' || vacation.status === statusFilter;

      const matchesEmployee =
        employeeFilter === 'TODOS' ||
        String(vacation.employeeId) === employeeFilter;

      return matchesSearch && matchesStatus && matchesEmployee;
    });
  }, [vacations, search, statusFilter, employeeFilter]);

  const totalVacations = vacations.length;
  const scheduledVacations = vacations.filter(
    (item) => item.status === 'PROGRAMADA'
  ).length;
  const pendingVacations = vacations.filter(
    (item) => item.status === 'PENDENTE'
  ).length;
  const completedVacations = vacations.filter(
    (item) => item.status === 'FINALIZADA'
  ).length;

  const getStatusBadge = (status) => {
    if (status === 'PROGRAMADA') {
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    }

    if (status === 'FINALIZADA') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }

    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  const formatDate = (date) => {
    if (!date) return '-';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString('pt-BR');
  };

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>Férias</h1>
            <p className='mt-1 text-slate-500'>
              Cadastro e gestão de férias dos colaboradores.
            </p>
          </div>

          <button
            type='button'
            onClick={openCreateDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            {editingId ? 'Editar férias' : '+ Nova férias'}
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de registros</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {totalVacations}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Programadas</p>
            <h2 className='mt-2 text-3xl font-bold text-blue-600'>
              {scheduledVacations}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Pendentes</p>
            <h2 className='mt-2 text-3xl font-bold text-amber-600'>
              {pendingVacations}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Finalizadas</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {completedVacations}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('lista')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'lista'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Lista
            </button>

            <button
              type='button'
              onClick={openCreateDrawer}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isCreateDrawerOpen
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {editingId ? 'Editar férias' : 'Novo cadastro'}
            </button>
          </div>
        </div>

        {activeTab === 'lista' && (
          <>
            <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
                <div className='xl:col-span-2'>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Busca rápida
                  </label>
                  <input
                    type='text'
                    placeholder='Buscar por colaborador, período ou status...'
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
                    <option value='PROGRAMADA'>Programada</option>
                    <option value='FINALIZADA'>Finalizada</option>
                  </select>
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Colaborador
                  </label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                    disabled={loadingEmployees}
                  >
                    <option value='TODOS'>Todos</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name || employee.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='border-b border-slate-200 px-6 py-5'>
                <h3 className='text-xl font-semibold text-slate-800'>
                  Lista de férias
                </h3>
                <p className='mt-1 text-sm text-slate-500'>
                  Pesquise, edite e exclua registros de férias.
                </p>
              </div>

              {loadingVacations ? (
                <div className='px-6 py-12 text-center text-slate-500'>
                  Carregando férias...
                </div>
              ) : filteredVacations.length === 0 ? (
                <div className='px-6 py-12 text-center text-slate-500'>
                  Nenhum registro de férias encontrado.
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
                          Período
                        </th>
                        <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                          Início
                        </th>
                        <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                          Fim
                        </th>
                        <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                          Dias
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
                      {filteredVacations.map((vacation) => (
                        <tr key={vacation.id} className='hover:bg-slate-50/70'>
                          <td className='px-6 py-5'>
                            <p className='font-semibold text-slate-900'>
                              {vacation.employee?.name ||
                                vacation.employee?.fullName ||
                                `#${vacation.employeeId}`}
                            </p>
                          </td>

                          <td className='px-6 py-5 text-sm text-slate-600'>
                            {vacation.acquisitionPeriod}
                          </td>

                          <td className='px-6 py-5 text-sm text-slate-600'>
                            {formatDate(vacation.startDate)}
                          </td>

                          <td className='px-6 py-5 text-sm text-slate-600'>
                            {formatDate(vacation.endDate)}
                          </td>

                          <td className='px-6 py-5 text-sm font-medium text-slate-800'>
                            {vacation.days}
                          </td>

                          <td className='px-6 py-5'>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                vacation.status
                              )}`}
                            >
                              {vacation.status}
                            </span>
                          </td>

                          <td className='px-6 py-5'>
                            <div className='flex flex-wrap items-center justify-center gap-2'>
                              <button
                                type='button'
                                onClick={() => handleEdit(vacation)}
                                className='rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100'
                              >
                                Editar
                              </button>

                              <button
                                type='button'
                                onClick={() => setVacationToDelete(vacation)}
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
          </>
        )}
      </div>

      {isCreateDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeCreateDrawer}
          />

          <div className='relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeCreateDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      {editingId ? 'Edição de férias' : 'Cadastro de férias'}
                    </div>

                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingId ? 'Editar férias' : 'Nova férias'}
                    </h2>

                    <p className='mt-1 text-sm text-slate-500'>
                      Preencha os dados abaixo para cadastrar férias do
                      colaborador no sistema.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeCreateDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados da programação
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Informações principais do período de férias.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Colaborador
                        </label>
                        <select
                          name='employeeId'
                          value={form.employeeId}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                          disabled={loadingEmployees}
                        >
                          <option value=''>Selecione o colaborador</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name || employee.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Período aquisitivo
                        </label>
                        <input
                          name='acquisitionPeriod'
                          placeholder='Ex: 2026/2027'
                          value={form.acquisitionPeriod}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Quantidade de dias
                        </label>
                        <input
                          type='number'
                          name='days'
                          placeholder='Quantidade de dias'
                          value={form.days}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de início
                        </label>
                        <input
                          type='date'
                          name='startDate'
                          value={form.startDate}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Data de fim
                        </label>
                        <input
                          type='date'
                          name='endDate'
                          value={form.endDate}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Status
                        </label>
                        <select
                          name='status'
                          value={form.status}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                        >
                          <option value='PENDENTE'>PENDENTE</option>
                          <option value='PROGRAMADA'>PROGRAMADA</option>
                          <option value='FINALIZADA'>FINALIZADA</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeCreateDrawer}
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
                      ? 'Salvando...'
                      : editingId
                        ? 'Atualizar férias'
                        : 'Cadastrar férias'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {vacationToDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl'>
            <h3 className='text-2xl font-bold text-slate-900'>
              Confirmar exclusão
            </h3>

            <p className='mt-3 text-slate-600'>
              Tem certeza que deseja excluir as férias de{' '}
              <span className='font-semibold text-slate-900'>
                {vacationToDelete.employee?.name ||
                  vacationToDelete.employee?.fullName ||
                  `#${vacationToDelete.employeeId}`}
              </span>
              ?
            </p>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setVacationToDelete(null)}
                className='rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                Cancelar
              </button>

              <button
                type='button'
                onClick={handleDelete}
                className='rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700'
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Vacations;
