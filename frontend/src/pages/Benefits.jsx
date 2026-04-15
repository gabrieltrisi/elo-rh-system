import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  employeeName: '',
  transportVoucher: false,
  transportVoucherType: '',
  mealVoucher: false,
  mealVoucherType: '',
  healthPlan: false,
  dentalPlan: false,
  notes: '',
};

const normalizeBenefitItem = (item) => {
  return {
    id: item.id,
    employeeId: Number(item.employeeId),
    employeeName: item.employee?.name || item.employeeName || '',
    transportVoucher: Boolean(item.transportVoucher),
    transportVoucherType: item.transportVoucherType || '',
    mealVoucher: Boolean(item.mealVoucher),
    mealVoucherType: item.mealVoucherType || '',
    healthPlan: Boolean(item.healthPlan),
    dentalPlan: Boolean(item.dentalPlan),
    notes: item.notes || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  };
};

const Benefits = () => {
  const [employees, setEmployees] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingBenefits, setLoadingBenefits] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    loadBenefits();
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

  const loadBenefits = async () => {
    try {
      setLoadingBenefits(true);
      const res = await api.get('/benefits');
      const rawBenefits = res.data?.benefits || [];
      setBenefits(rawBenefits.map(normalizeBenefitItem));
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
      setBenefits([]);
      alert(error?.response?.data?.message || 'Erro ao carregar benefícios.');
    } finally {
      setLoadingBenefits(false);
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

    if (name === 'transportVoucher') {
      setFormData((prev) => ({
        ...prev,
        transportVoucher: checked,
        transportVoucherType: checked ? prev.transportVoucherType : '',
      }));
      return;
    }

    if (name === 'mealVoucher') {
      setFormData((prev) => ({
        ...prev,
        mealVoucher: checked,
        mealVoucherType: checked ? prev.mealVoucherType || 'Caju' : '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.employeeName) {
      alert('Selecione o colaborador.');
      return;
    }

    if (formData.transportVoucher && !formData.transportVoucherType) {
      alert('Selecione o tipo do Vale Transporte.');
      return;
    }

    if (formData.mealVoucher && !formData.mealVoucherType) {
      alert('Selecione o tipo do Vale Alimentação/Refeição.');
      return;
    }

    const payload = {
      employeeId: Number(formData.employeeId),
      employeeName: formData.employeeName,
      transportVoucher: formData.transportVoucher,
      transportVoucherType: formData.transportVoucher
        ? formData.transportVoucherType
        : '',
      mealVoucher: formData.mealVoucher,
      mealVoucherType: formData.mealVoucher ? formData.mealVoucherType : '',
      healthPlan: formData.healthPlan,
      dentalPlan: formData.dentalPlan,
      notes: formData.notes,
    };

    try {
      setSaving(true);
      await api.post('/benefits', payload);
      await loadBenefits();
      closeDrawer();
    } catch (error) {
      console.error('Erro ao salvar benefícios:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar benefícios.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Deseja excluir este cadastro de benefícios?'
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/benefits/${id}`);
      await loadBenefits();
    } catch (error) {
      console.error('Erro ao excluir benefícios:', error);
      alert(error?.response?.data?.message || 'Erro ao excluir benefícios.');
    }
  };

  const filteredBenefits = useMemo(() => {
    return benefits.filter((item) =>
      `
        ${item.employeeName || ''}
        ${item.notes || ''}
        ${item.transportVoucherType || ''}
        ${item.mealVoucherType || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [benefits, search]);

  const stats = useMemo(() => {
    return {
      total: benefits.length,
      transport: benefits.filter((b) => b.transportVoucher).length,
      meal: benefits.filter((b) => b.mealVoucher).length,
      health: benefits.filter((b) => b.healthPlan).length,
      dental: benefits.filter((b) => b.dentalPlan).length,
    };
  }, [benefits]);

  const renderBenefitBadge = (enabled, label) => {
    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          enabled
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border border-slate-200 bg-slate-100 text-slate-600'
        }`}
      >
        {label}
      </span>
    );
  };

  const renderOverview = () => {
    if (loadingBenefits) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando benefícios...
        </div>
      );
    }

    if (filteredBenefits.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum benefício cadastrado.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filteredBenefits.map((item) => (
          <div
            key={item.id}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          >
            <div className='flex flex-col gap-4'>
              <div>
                <h3 className='text-xl font-bold text-slate-800'>
                  {item.employeeName}
                </h3>
                <p className='mt-1 text-sm text-slate-500'>
                  Configuração de benefícios
                </p>
              </div>

              <div className='flex flex-wrap gap-2'>
                {renderBenefitBadge(item.transportVoucher, 'Vale Transporte')}
                {renderBenefitBadge(item.mealVoucher, 'Vale Alimentação')}
                {renderBenefitBadge(item.healthPlan, 'Plano de Saúde')}
                {renderBenefitBadge(item.dentalPlan, 'Plano Odontológico')}
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Tipo de VT</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {item.transportVoucher
                      ? item.transportVoucherType || '-'
                      : 'Não possui'}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Tipo de VA</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {item.mealVoucher
                      ? item.mealVoucherType || '-'
                      : 'Não possui'}
                  </p>
                </div>
              </div>

              {item.notes ? (
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Observações</p>
                  <p className='mt-1 text-sm font-medium text-slate-700'>
                    {item.notes}
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

  const renderList = () => {
    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>
            Lista de benefícios
          </h3>
        </div>

        {loadingBenefits ? (
          <div className='px-6 py-10 text-slate-500'>
            Carregando benefícios...
          </div>
        ) : filteredBenefits.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhum benefício cadastrado.
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
                    Vale Transporte
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Tipo VT
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Vale Alimentação
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Tipo VA
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Saúde
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Odontológico
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filteredBenefits.map((item) => (
                  <tr key={item.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5 font-semibold text-slate-800'>
                      {item.employeeName}
                    </td>
                    <td className='px-6 py-5'>
                      {renderBenefitBadge(
                        item.transportVoucher,
                        item.transportVoucher ? 'Ativo' : 'Inativo'
                      )}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-700'>
                      {item.transportVoucherType || '-'}
                    </td>
                    <td className='px-6 py-5'>
                      {renderBenefitBadge(
                        item.mealVoucher,
                        item.mealVoucher ? 'Ativo' : 'Inativo'
                      )}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-700'>
                      {item.mealVoucherType || '-'}
                    </td>
                    <td className='px-6 py-5'>
                      {renderBenefitBadge(
                        item.healthPlan,
                        item.healthPlan ? 'Ativo' : 'Inativo'
                      )}
                    </td>
                    <td className='px-6 py-5'>
                      {renderBenefitBadge(
                        item.dentalPlan,
                        item.dentalPlan ? 'Ativo' : 'Inativo'
                      )}
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
            <h1 className='text-3xl font-bold text-slate-800'>Benefícios</h1>
            <p className='mt-1 text-slate-500'>
              Gestão de VT, VA, plano de saúde e plano odontológico.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo cadastro
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de colaboradores</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.total}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Vale Transporte</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.transport}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Vale Alimentação</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.meal}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Plano de Saúde</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.health}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Plano Odontológico</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.dental}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <label className='mb-2 block text-sm font-semibold text-slate-700'>
            Buscar
          </label>
          <input
            type='text'
            placeholder='Buscar por colaborador, observações ou tipo de benefício'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
          />
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
                      Cadastro de benefícios
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Benefícios
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure os benefícios do colaborador.
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
                        Selecione o colaborador relacionado aos benefícios.
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
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Benefícios
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Ative e configure os benefícios concedidos.
                      </p>
                    </div>

                    <div className='space-y-5'>
                      <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <label className='flex items-center gap-3'>
                          <input
                            type='checkbox'
                            name='transportVoucher'
                            checked={formData.transportVoucher}
                            onChange={handleChange}
                          />
                          <span className='font-medium text-slate-800'>
                            Vale Transporte
                          </span>
                        </label>

                        {formData.transportVoucher ? (
                          <div className='mt-4'>
                            <label className='mb-2 block text-sm font-semibold text-slate-700'>
                              Tipo de VT
                            </label>
                            <select
                              name='transportVoucherType'
                              value={formData.transportVoucherType}
                              onChange={handleChange}
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            >
                              <option value=''>Selecione o tipo</option>
                              <option value='CCR'>CCR</option>
                              <option value='Salvador Card'>
                                Salvador Card
                              </option>
                            </select>
                          </div>
                        ) : null}
                      </div>

                      <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <label className='flex items-center gap-3'>
                          <input
                            type='checkbox'
                            name='mealVoucher'
                            checked={formData.mealVoucher}
                            onChange={handleChange}
                          />
                          <span className='font-medium text-slate-800'>
                            Vale Alimentação / Refeição
                          </span>
                        </label>

                        {formData.mealVoucher ? (
                          <div className='mt-4'>
                            <label className='mb-2 block text-sm font-semibold text-slate-700'>
                              Tipo de VA
                            </label>
                            <select
                              name='mealVoucherType'
                              value={formData.mealVoucherType}
                              onChange={handleChange}
                              className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            >
                              <option value=''>Selecione o tipo</option>
                              <option value='Caju'>Caju</option>
                            </select>
                          </div>
                        ) : null}
                      </div>

                      <label className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='healthPlan'
                          checked={formData.healthPlan}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Plano de Saúde
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='dentalPlan'
                          checked={formData.dentalPlan}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Plano Odontológico
                        </span>
                      </label>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observações
                        </label>
                        <textarea
                          name='notes'
                          value={formData.notes}
                          onChange={handleChange}
                          rows='4'
                          placeholder='Informações adicionais sobre os benefícios'
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
                    {saving ? 'Salvando...' : 'Salvar benefícios'}
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

export default Benefits;
