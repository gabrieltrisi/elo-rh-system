import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

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
  const [loadingSuspensions, setLoadingSuspensions] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchSuspensions();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await api.get('/employees');
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchSuspensions = async () => {
    try {
      setLoadingSuspensions(true);
      const res = await api.get('/suspensions');
      setSuspensions(res.data.suspensions || []);
    } catch (error) {
      console.error('Erro ao buscar suspensões:', error);
      setSuspensions([]);
    } finally {
      setLoadingSuspensions(false);
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
      const emp = employees.find((e) => String(e.id) === value);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        employeeName: emp?.name || '',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.title || !formData.startDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);

      await api.post('/suspensions', {
        employeeId: Number(formData.employeeId),
        title: formData.title,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        description: formData.description,
      });

      await fetchSuspensions();
      closeDrawer();
    } catch (error) {
      console.error('Erro ao salvar suspensão:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar suspensão');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Deseja excluir esta suspensão?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/suspensions/${id}`);
      await fetchSuspensions();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir');
    }
  };

  const filtered = useMemo(() => {
    return suspensions.filter((item) => {
      const matchesSearch = `
        ${item.employee?.name || ''}
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
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between'>
        <h1 className='text-2xl font-bold'>Suspensões</h1>
        <button onClick={openDrawer} className='btn'>
          + Nova suspensão
        </button>
      </div>

      <div>Total: {stats.total}</div>

      {loadingSuspensions ? (
        <p>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p>Nenhuma suspensão encontrada</p>
      ) : (
        filtered.map((item) => (
          <div key={item.id} className='card'>
            <h3>{item.title}</h3>
            <p>{item.employee?.name}</p>
            <p>
              {formatDate(item.startDate)} até {formatDate(item.endDate)}
            </p>

            <button onClick={() => handleDelete(item.id)}>Excluir</button>
          </div>
        ))
      )}

      {isDrawerOpen && (
        <form onSubmit={handleCreate}>
          <select
            name='employeeId'
            value={formData.employeeId}
            onChange={handleChange}
          >
            <option value=''>Selecione</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <input
            name='title'
            value={formData.title}
            onChange={handleChange}
            placeholder='Título'
          />

          <input
            type='date'
            name='startDate'
            value={formData.startDate}
            onChange={handleChange}
          />

          <input
            type='date'
            name='endDate'
            value={formData.endDate}
            onChange={handleChange}
          />

          <textarea
            name='description'
            value={formData.description}
            onChange={handleChange}
          />

          <button type='submit'>{saving ? 'Salvando...' : 'Cadastrar'}</button>
        </form>
      )}
    </div>
  );
};

export default Suspensions;
