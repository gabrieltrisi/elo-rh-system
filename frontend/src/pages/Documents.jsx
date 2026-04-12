import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';

const initialForm = {
  employeeId: '',
  employeeName: '',
  title: '',
  category: 'Contrato',
  date: '',
  description: '',
  fileName: '',
  fileData: '',
};

const Documents = () => {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    const saved = localStorage.getItem('documents');
    setDocuments(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem('documents', JSON.stringify(documents));
  }, [documents]);

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.title || !formData.date) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);

      const newDocument = {
        id: Date.now(),
        ...formData,
        employeeId: Number(formData.employeeId),
        createdAt: new Date().toISOString(),
      };

      setDocuments((prev) => [newDocument, ...prev]);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm('Deseja excluir este documento?');
    if (!confirmDelete) return;

    setDocuments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenFile = (fileData) => {
    if (!fileData) return;
    window.open(fileData, '_blank');
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((item) => {
      const matchesSearch = `
        ${item.employeeName || ''}
        ${item.title || ''}
        ${item.category || ''}
        ${item.description || ''}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'Todos' ||
        (item.category || '').toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [documents, search, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      contracts: documents.filter((d) => d.category === 'Contrato').length,
      policies: documents.filter((d) => d.category === 'Política interna')
        .length,
      manuals: documents.filter((d) => d.category === 'Manual').length,
    };
  }, [documents]);

  const formatDate = (date) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('pt-BR');
  };

  const renderOverview = () => {
    if (filteredDocuments.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum documento encontrado.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {filteredDocuments.map((item) => (
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

                <span className='inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                  {item.category}
                </span>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Data</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {formatDate(item.date)}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm text-slate-500'>Arquivo</p>
                  <p className='mt-1 font-semibold text-slate-800'>
                    {item.fileName || '-'}
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
                {item.fileData ? (
                  <button
                    type='button'
                    onClick={() => handleOpenFile(item.fileData)}
                    className='rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'
                  >
                    Ver arquivo
                  </button>
                ) : null}

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
            Lista de documentos
          </h3>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className='px-6 py-10 text-slate-500'>
            Nenhum documento encontrado.
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
                    Categoria
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Data
                  </th>
                  <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Arquivo
                  </th>
                  <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className='divide-y divide-slate-100'>
                {filteredDocuments.map((item) => (
                  <tr key={item.id} className='hover:bg-slate-50/70'>
                    <td className='px-6 py-5 font-semibold text-slate-800'>
                      {item.employeeName}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-700'>
                      {item.title}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {item.category}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {formatDate(item.date)}
                    </td>
                    <td className='px-6 py-5 text-sm text-slate-600'>
                      {item.fileName || '-'}
                    </td>
                    <td className='px-6 py-5'>
                      <div className='flex flex-wrap items-center justify-center gap-2'>
                        {item.fileData ? (
                          <button
                            type='button'
                            onClick={() => handleOpenFile(item.fileData)}
                            className='rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100'
                          >
                            Ver
                          </button>
                        ) : null}

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
            <h1 className='text-3xl font-bold text-slate-800'>
              Documentação / Arquivos
            </h1>
            <p className='mt-1 text-slate-500'>
              Upload e consulta de contratos, políticas internas e manuais.
            </p>
          </div>

          <button
            onClick={openDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo documento
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total de arquivos</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.total}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Contratos</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.contracts}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Políticas</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.policies}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Manuais</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {stats.manuals}
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
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='Todos'>Todos</option>
                <option value='Contrato'>Contrato</option>
                <option value='Política interna'>Política interna</option>
                <option value='Manual'>Manual</option>
                <option value='Termo'>Termo</option>
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
                      Cadastro de documento
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Novo documento
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Registre um novo arquivo interno vinculado ao colaborador.
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
                    </div>

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
                          placeholder='Ex: Contrato de trabalho'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Categoria
                        </label>
                        <select
                          name='category'
                          value={formData.category}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value='Contrato'>Contrato</option>
                          <option value='Política interna'>
                            Política interna
                          </option>
                          <option value='Manual'>Manual</option>
                          <option value='Termo'>Termo</option>
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

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Arquivo
                        </label>
                        <input
                          type='file'
                          onChange={handleFileChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium'
                        />
                        {formData.fileName ? (
                          <p className='mt-2 text-xs text-slate-500'>
                            Arquivo selecionado: {formData.fileName}
                          </p>
                        ) : null}
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
                          placeholder='Observações sobre o documento'
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
                    {saving ? 'Salvando...' : 'Cadastrar documento'}
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

export default Documents;
