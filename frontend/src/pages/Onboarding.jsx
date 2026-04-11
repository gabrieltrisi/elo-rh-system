import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const initialForm = {
  employeeId: '',
  employeeName: '',
  welcomeMeeting: false,
  systemAccess: false,
  documentsDelivered: false,
  uniformDelivered: false,
  trainingCompleted: false,
  notes: '',
};

const Onboarding = () => {
  const [employees, setEmployees] = useState([]);
  const [onboardings, setOnboardings] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchEmployees();
    const saved = localStorage.getItem('onboarding');
    setOnboardings(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem('onboarding', JSON.stringify(onboardings));
  }, [onboardings]);

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

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreate = (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.employeeName) {
      alert('Selecione o colaborador.');
      return;
    }

    try {
      setSaving(true);

      const existing = onboardings.find(
        (item) => Number(item.employeeId) === Number(formData.employeeId)
      );

      if (existing) {
        const updated = onboardings.map((item) =>
          Number(item.employeeId) === Number(formData.employeeId)
            ? {
                ...item,
                ...formData,
                employeeId: Number(formData.employeeId),
                updatedAt: new Date().toISOString(),
              }
            : item
        );
        setOnboardings(updated);
      } else {
        const newItem = {
          id: Date.now(),
          ...formData,
          employeeId: Number(formData.employeeId),
          createdAt: new Date().toISOString(),
        };
        setOnboardings((prev) => [newItem, ...prev]);
      }

      closeDrawer();
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return onboardings.filter((item) =>
      `${item.employeeName || ''} ${item.notes || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [onboardings, search]);

  const stats = useMemo(() => {
    const completed = onboardings.filter(
      (item) =>
        item.welcomeMeeting &&
        item.systemAccess &&
        item.documentsDelivered &&
        item.uniformDelivered &&
        item.trainingCompleted
    ).length;

    return {
      total: onboardings.length,
      completed,
      pending: onboardings.length - completed,
    };
  }, [onboardings]);

  const renderStep = (enabled, label) => (
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

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>
              Integração (Onboarding)
            </h1>
            <p className='mt-1 text-slate-500'>
              Checklist de boas-vindas para novos colaboradores.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo onboarding
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.total}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Concluídos</p>
            <h2 className='mt-2 text-3xl font-bold text-emerald-600'>
              {stats.completed}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Pendentes</p>
            <h2 className='mt-2 text-3xl font-bold text-amber-600'>
              {stats.pending}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <label className='mb-2 block text-sm font-semibold text-slate-700'>
            Buscar
          </label>
          <input
            type='text'
            placeholder='Buscar por colaborador'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
          />
        </div>

        {filtered.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
            Nenhum onboarding cadastrado.
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            {filtered.map((item) => (
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
                      Checklist de integração
                    </p>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    {renderStep(item.welcomeMeeting, 'Boas-vindas')}
                    {renderStep(item.systemAccess, 'Acesso aos sistemas')}
                    {renderStep(item.documentsDelivered, 'Documentos')}
                    {renderStep(item.uniformDelivered, 'Fardamento')}
                    {renderStep(item.trainingCompleted, 'Treinamento')}
                  </div>

                  {item.notes ? (
                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                      <p className='text-sm text-slate-500'>Observações</p>
                      <p className='mt-1 text-sm font-medium text-slate-700'>
                        {item.notes}
                      </p>
                    </div>
                  ) : null}
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
                      Checklist de integração
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Novo onboarding
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure o checklist de entrada do colaborador.
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
                    <div className='space-y-4'>
                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='welcomeMeeting'
                          checked={formData.welcomeMeeting}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Boas-vindas realizadas
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='systemAccess'
                          checked={formData.systemAccess}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Acesso aos sistemas
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='documentsDelivered'
                          checked={formData.documentsDelivered}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Documentos entregues
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='uniformDelivered'
                          checked={formData.uniformDelivered}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Fardamento entregue
                        </span>
                      </label>

                      <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                        <input
                          type='checkbox'
                          name='trainingCompleted'
                          checked={formData.trainingCompleted}
                          onChange={handleChange}
                        />
                        <span className='font-medium text-slate-800'>
                          Treinamento concluído
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
                          placeholder='Observações sobre a integração'
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
                    {saving ? 'Salvando...' : 'Salvar onboarding'}
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

export default Onboarding;
