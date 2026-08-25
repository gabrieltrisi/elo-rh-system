import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'RH', label: 'RH' },
  { value: 'GESTOR', label: 'Gestor' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
];

const statusOptions = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'INATIVO', label: 'Inativo' },
  { value: 'BLOQUEADO', label: 'Bloqueado' },
];

const createInitialForm = () => ({
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'ADMIN',
  status: 'ATIVO',
  companyId: '',
  employeeId: '',
  profileIds: [],
  mustChangePassword: true,
});

const formatDateTime = (value) => {
  if (!value) return 'Nunca';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const statusClasses = {
  ATIVO: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  INATIVO: 'border border-amber-200 bg-amber-50 text-amber-700',
  BLOQUEADO: 'border border-red-200 bg-red-50 text-red-700',
};

const securityPillClasses = {
  enabled: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border border-slate-200 bg-slate-100 text-slate-600',
  warning: 'border border-amber-200 bg-amber-50 text-amber-700',
};

const roleToneClasses = {
  SUPER_ADMIN: 'border border-violet-200 bg-violet-50 text-violet-700',
  ADMIN: 'border border-slate-200 bg-slate-100 text-slate-700',
  RH: 'border border-blue-200 bg-blue-50 text-blue-700',
  GESTOR: 'border border-cyan-200 bg-cyan-50 text-cyan-700',
  VISUALIZADOR: 'border border-slate-200 bg-white text-slate-600',
};

const Users = () => {
  const { hasPermission } = useAuthSession();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    blocked: 0,
    linkedEmployees: 0,
    unlinkedEmployees: 0,
    neverLoggedIn: 0,
    recentAccess: 0,
    roleDistribution: [],
  });
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [companyFilter, setCompanyFilter] = useState('TODOS');
  const [employeeLinkFilter, setEmployeeLinkFilter] = useState('TODOS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetMustChangePassword, setResetMustChangePassword] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchSupportData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter, companyFilter, employeeLinkFilter]);

  const fetchSupportData = async () => {
    try {
      const requests = [
        api.get('/companies'),
        api.get('/employees', {
          params: {
            scope: 'all',
          },
        }),
      ];

      const shouldLoadProfiles =
        hasPermission('profiles.read') &&
        (hasPermission('users.create') || hasPermission('users.update'));

      if (shouldLoadProfiles) {
        requests.push(api.get('/profiles'));
      }

      const [companiesResponse, employeesResponse, profilesResponse] =
        await Promise.all(requests);

      setCompanies(companiesResponse.data?.companies || []);
      setEmployees(employeesResponse.data?.employees || []);
      setProfiles(profilesResponse.data?.profiles || []);
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares de usuários:', error);
      setCompanies([]);
      setEmployees([]);
      setProfiles([]);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'TODOS') params.role = roleFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;
      if (companyFilter !== 'TODOS') params.companyId = companyFilter;
      if (employeeLinkFilter === 'VINCULADO') params.employeeLink = 'linked';
      if (employeeLinkFilter === 'SEM_VINCULO') params.employeeLink = 'unlinked';

      const response = await api.get('/users', { params });
      setUsers(response.data?.users || []);
      setSummary(
        response.data?.summary || {
          total: 0,
          active: 0,
          inactive: 0,
          blocked: 0,
          linkedEmployees: 0,
          unlinkedEmployees: 0,
          neverLoggedIn: 0,
          recentAccess: 0,
          roleDistribution: [],
        }
      );
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      alert(error?.response?.data?.message || 'Não foi possível carregar os usuários.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const profileDistributionText = useMemo(() => {
    const relevantRoles = ['ADMIN', 'RH', 'GESTOR'];

    const parts = relevantRoles.map((role) => {
      const found = summary.roleDistribution?.find((item) => item.role === role);
      const label = roleOptions.find((item) => item.value === role)?.label || role;
      return `${label}: ${found?.count || 0}`;
    });

    return parts.join(' • ');
  }, [summary.roleDistribution]);

  const privilegedProfilesCount = useMemo(() => {
    return ['SUPER_ADMIN', 'ADMIN', 'RH', 'GESTOR'].reduce((acc, role) => {
      const found = summary.roleDistribution?.find((item) => item.role === role);
      return acc + (found?.count || 0);
    }, 0);
  }, [summary.roleDistribution]);

  const openCreateDrawer = () => {
    setEditingUser(null);
    setFormData({
      ...createInitialForm(),
      companyId: companies[0]?.id ? String(companies[0].id) : '',
      profileIds: [],
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      role: user.role || 'ADMIN',
      status: user.status || 'ATIVO',
      companyId: user.companyId ? String(user.companyId) : '',
      employeeId: user.employeeId ? String(user.employeeId) : '',
      profileIds: Array.isArray(user.profiles)
        ? user.profiles.map((profile) => String(profile.id))
        : [],
      mustChangePassword: Boolean(user.mustChangePassword),
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingUser(null);
    setFormData(createInitialForm());
    setIsDrawerOpen(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'select-multiple'
          ? Array.from(event.target.selectedOptions, (option) => option.value)
          : type === 'checkbox'
            ? checked
            : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.role || !formData.companyId) {
      alert('Preencha nome, e-mail, perfil e empresa do usuário.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      alert('Informe a senha inicial do usuário.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim() || null,
        role: formData.role,
        status: formData.status,
        companyId: Number(formData.companyId),
        employeeId: formData.employeeId ? Number(formData.employeeId) : null,
        profileIds: formData.profileIds.map((profileId) => Number(profileId)),
        mustChangePassword: Boolean(formData.mustChangePassword),
      };

      if (!editingUser) {
        payload.password = formData.password;
        await api.post('/users', payload);
      } else {
        await api.put(`/users/${editingUser.id}`, payload);
      }

      closeDrawer();
      fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert(error?.response?.data?.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    try {
      await api.patch(`/users/${user.id}/status`, { status: nextStatus });
      fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      alert(error?.response?.data?.message || 'Não foi possível alterar o status.');
    }
  };

  const handleBlockUser = async (user) => {
    try {
      await api.patch(`/users/${user.id}/status`, { status: 'BLOQUEADO' });
      fetchUsers();
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
      alert(error?.response?.data?.message || 'Não foi possível bloquear o usuário.');
    }
  };

  const handleUnlockTemporaryAccess = async (user) => {
    try {
      await api.patch(`/users/${user.id}/security/unlock`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao desbloquear acesso temporario:', error);
      alert(
        error?.response?.data?.message ||
          'Nao foi possivel remover o bloqueio temporario.'
      );
    }
  };

  const openResetPasswordModal = (user) => {
    setResetTarget(user);
    setResetPassword('');
    setResetMustChangePassword(true);
  };

  const closeResetPasswordModal = () => {
    setResetTarget(null);
    setResetPassword('');
    setResetMustChangePassword(true);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetPassword.trim()) {
      alert('Informe a nova senha.');
      return;
    }

    try {
      setResettingPassword(true);

      await api.patch(`/users/${resetTarget.id}/reset-password`, {
        password: resetPassword,
        mustChangePassword: resetMustChangePassword,
      });

      closeResetPasswordModal();
      fetchUsers();
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert(error?.response?.data?.message || 'Não foi possível redefinir a senha.');
    } finally {
      setResettingPassword(false);
    }
  };

  const companyEmployeeOptions = useMemo(() => {
    if (!formData.companyId) return employees;

    return employees.filter((employee) =>
      Array.isArray(employee.companies)
        ? employee.companies.some(
            (company) => Number(company.companyId) === Number(formData.companyId)
          )
        : Number(employee.companyId) === Number(formData.companyId)
    );
  }, [employees, formData.companyId]);

  const canCreateUsers = hasPermission('users.create');
  const canUpdateUsers = hasPermission('users.update');
  const canManageUserStatus = hasPermission('users.status');
  const canResetPasswords = hasPermission('users.reset_password');
  const canUnlockSecurity = hasPermission('security.manage');

  const renderList = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando usuários...
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum usuário encontrado.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>Lista de usuários</h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Usuário
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Email
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Perfil
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Status
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Colaborador vinculado
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Último acesso
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Seguranca
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Criação
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {users.map((user) => (
                <tr key={user.id} className='hover:bg-slate-50/70'>
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>{user.name || '-'}</p>
                      <p className='mt-1 text-sm text-slate-500'>
                        {user.username ? `@${user.username}` : user.companyName || 'Sem empresa'}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>{user.email}</td>
                  <td className='px-6 py-5'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        roleToneClasses[user.role] || roleToneClasses.ADMIN
                      }`}
                    >
                      {user.primaryProfile ||
                        roleOptions.find((item) => item.value === user.role)?.label ||
                        user.role}
                    </span>
                    {Array.isArray(user.profiles) && user.profiles.length > 1 ? (
                      <p className='mt-2 text-xs text-slate-500'>
                        +{user.profiles.length - 1} perfil(is) adicional(is)
                      </p>
                    ) : null}
                  </td>
                  <td className='px-6 py-5'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusClasses[user.status] || statusClasses.ATIVO
                      }`}
                    >
                      {statusOptions.find((item) => item.value === user.status)?.label || user.status}
                    </span>
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {user.employee ? (
                      <div>
                        <p className='font-semibold text-slate-800'>{user.employee.name}</p>
                        <p className='mt-1 text-xs text-slate-500'>
                          {user.employee.role || '-'} • {user.employee.department || '-'}
                        </p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-col gap-2 text-xs'>
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 font-semibold ${
                          user.security?.mfaEnabled
                            ? securityPillClasses.enabled
                            : securityPillClasses.disabled
                        }`}
                      >
                        {user.security?.mfaEnabled ? 'MFA ativo' : 'MFA pendente'}
                      </span>
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 font-semibold ${
                          user.security?.lockUntil
                            ? securityPillClasses.warning
                            : securityPillClasses.disabled
                        }`}
                      >
                        {user.security?.lockUntil
                          ? 'Bloqueio temporario'
                          : `${user.security?.activeSessions || 0} sessoes`}
                      </span>
                    </div>
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {canUpdateUsers ? (
                        <MiniActionButton
                          label='Editar'
                          tone='blue'
                          onClick={() => openEditDrawer(user)}
                        />
                      ) : null}
                      {canManageUserStatus ? (
                        <MiniActionButton
                          label={user.status === 'ATIVO' ? 'Inativar' : 'Ativar'}
                          tone='amber'
                          onClick={() => handleToggleStatus(user)}
                        />
                      ) : null}
                      {canResetPasswords ? (
                        <MiniActionButton
                          label='Reset senha'
                          tone='violet'
                          onClick={() => openResetPasswordModal(user)}
                        />
                      ) : null}
                      {canManageUserStatus && user.status !== 'BLOQUEADO' ? (
                        <MiniActionButton
                          label='Bloquear'
                          tone='red'
                          onClick={() => handleBlockUser(user)}
                        />
                      ) : null}
                      {canUnlockSecurity && user.security?.lockUntil ? (
                        <MiniActionButton
                          label='Desbloquear'
                          tone='green'
                          onClick={() => handleUnlockTemporaryAccess(user)}
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

  const renderCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando usuários...
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum usuário encontrado.
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {users.map((user) => (
          <div
            key={user.id}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                    Usuário do sistema
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>{user.name || '-'}</h3>
                  <p className='mt-1 text-sm text-slate-300'>{user.email}</p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    statusClasses[user.status] || statusClasses.ATIVO
                  }`}
                >
                  {statusOptions.find((item) => item.value === user.status)?.label || user.status}
                </span>
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox
                  label='Perfil'
                  value={
                    user.primaryProfile ||
                    roleOptions.find((item) => item.value === user.role)?.label ||
                    user.role
                  }
                />
                <InfoBox label='Empresa' value={user.companyName || '-'} />
                <InfoBox label='Username' value={user.username ? `@${user.username}` : '-'} />
                <InfoBox label='Último acesso' value={formatDateTime(user.lastLoginAt)} />
                <InfoBox
                  label='MFA'
                  value={user.security?.mfaEnabled ? 'Ativo' : 'Nao configurado'}
                />
                <InfoBox label='Criação' value={formatDateTime(user.createdAt)} />
                <InfoBox
                  label='Obrigar troca de senha'
                  value={user.mustChangePassword ? 'Sim' : 'Não'}
                />
                <InfoBox
                  label='Sessoes ativas'
                  value={String(user.security?.activeSessions || 0)}
                />
                <InfoBox
                  label='Bloqueio temporario'
                  value={
                    user.security?.lockUntil
                      ? formatDateTime(user.security.lockUntil)
                      : 'Nao'
                  }
                />
              </div>

              {user.employee ? (
                <div className='rounded-2xl border border-blue-200 bg-blue-50 p-4'>
                  <p className='text-sm text-blue-700'>Colaborador vinculado</p>
                  <p className='mt-1 text-sm font-semibold text-blue-900'>{user.employee.name}</p>
                  <p className='mt-1 text-xs text-blue-700'>
                    {user.employee.role || '-'} • {user.employee.department || '-'}
                  </p>
                </div>
              ) : (
                <div className='rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700'>
                  Usuário sem vínculo com colaborador.
                </div>
              )}

              <div className='flex flex-wrap gap-3'>
                <ActionButton label='Editar usuário' tone='blue' onClick={() => openEditDrawer(user)} />
                <ActionButton
                  label={user.status === 'ATIVO' ? 'Inativar acesso' : 'Ativar acesso'}
                  tone='amber'
                  onClick={() => handleToggleStatus(user)}
                />
                <ActionButton
                  label='Redefinir senha'
                  tone='violet'
                  onClick={() => openResetPasswordModal(user)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className='space-y-8'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-indigo-200'>
                Governança de acesso
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>Usuários</h1>
              <p className='mt-4 text-lg text-slate-300'>
                Administre contas de acesso, perfis, vínculo com colaboradores e
                status de autenticação sem misturar com o cadastro de RH.
              </p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <button
                type='button'
                onClick={openCreateDrawer}
                className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
              >
                + Novo usuário
              </button>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-6'>
          <InfoCard title='Total de usuários' value={summary.total} subtitle='Contas cadastradas' tone='slate' />
          <InfoCard title='Ativos' value={summary.active} subtitle='Acesso liberado' tone='green' />
          <InfoCard title='Inativos' value={summary.inactive} subtitle='Sem acesso' tone='amber' />
          <InfoCard title='Bloqueados' value={summary.blocked} subtitle='Bloqueio administrativo' tone='red' />
          <InfoCard title='Sem vínculo RH' value={summary.unlinkedEmployees} subtitle='Sem colaborador vinculado' tone='orange' />
          <InfoCard title='Perfis-chave' value={privilegedProfilesCount} subtitle={profileDistributionText} tone='violet' />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-5'>
            <div className='xl:col-span-2'>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Buscar</label>
              <input
                type='text'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Buscar por nome, email ou username'
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Perfil</label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Empresa</label>
              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Vínculo RH</label>
              <select
                value={employeeLinkFilter}
                onChange={(event) => setEmployeeLinkFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                <option value='TODOS'>Todos</option>
                <option value='VINCULADO'>Vinculados</option>
                <option value='SEM_VINCULO'>Sem vínculo</option>
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

        {activeTab === 'overview' ? renderCards() : renderList()}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]' onClick={closeDrawer} />

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
                      Gestão de acesso
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingUser ? 'Editar usuário' : 'Novo usuário'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Configure perfil, status, empresa e vínculo opcional com colaborador.
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
                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>Nome</label>
                        <input
                          type='text'
                          name='name'
                          value={formData.name}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Nome do usuário'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>E-mail</label>
                        <input
                          type='email'
                          name='email'
                          value={formData.email}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='email@empresa.com'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>Username</label>
                        <input
                          type='text'
                          name='username'
                          value={formData.username}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='opcional'
                        />
                      </div>

                      {!editingUser ? (
                        <div className='md:col-span-2'>
                          <label className='mb-2 block text-sm font-semibold text-slate-700'>Senha inicial</label>
                          <input
                            type='password'
                            name='password'
                            value={formData.password}
                            onChange={handleChange}
                            className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                            placeholder='Mínimo de 6 caracteres'
                          />
                        </div>
                      ) : null}

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>Perfil</label>
                        <select
                          name='role'
                          value={formData.role}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>Status</label>
                        <select
                          name='status'
                          value={formData.status}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Perfis vinculados
                        </label>
                        <select
                          multiple
                          name='profileIds'
                          value={formData.profileIds}
                          onChange={handleChange}
                          className='min-h-[148px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          {profiles
                            .filter((profile) => profile.isActive)
                            .map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name} • {profile.slug}
                              </option>
                            ))}
                        </select>
                        <p className='mt-2 text-xs text-slate-500'>
                          O primeiro perfil principal compatível com a role do usuário será
                          usado como base de autorização.
                        </p>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>Empresa</label>
                        <select
                          name='companyId'
                          value={formData.companyId}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value=''>Selecione</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Colaborador vinculado
                        </label>
                        <select
                          name='employeeId'
                          value={formData.employeeId}
                          onChange={handleChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                        >
                          <option value=''>Sem vínculo</option>
                          {companyEmployeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.fullName || employee.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <label className='flex items-center gap-3 text-sm font-semibold text-slate-700'>
                          <input
                            type='checkbox'
                            name='mustChangePassword'
                            checked={formData.mustChangePassword}
                            onChange={handleChange}
                            className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                          />
                          Obrigar troca de senha no próximo acesso
                        </label>
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
                    {saving
                      ? editingUser
                        ? 'Salvando...'
                        : 'Criando...'
                      : editingUser
                        ? 'Salvar alterações'
                        : 'Criar usuário'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <div className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]' onClick={closeResetPasswordModal} />

          <div className='relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='mb-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700'>
                  Redefinição administrativa
                </div>
                <h3 className='text-2xl font-bold text-slate-800'>Resetar senha</h3>
                <p className='mt-1 text-sm text-slate-500'>{resetTarget.name || resetTarget.email}</p>
              </div>

              <button
                type='button'
                onClick={closeResetPasswordModal}
                className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className='mt-6 space-y-5'>
              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>Nova senha</label>
                <input
                  type='password'
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder='Digite a nova senha'
                  className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                />
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <label className='flex items-center gap-3 text-sm font-semibold text-slate-700'>
                  <input
                    type='checkbox'
                    checked={resetMustChangePassword}
                    onChange={(event) => setResetMustChangePassword(event.target.checked)}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                  Obrigar troca de senha no próximo login
                </label>
              </div>

              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={closeResetPasswordModal}
                  className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={resettingPassword}
                  className='rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {resettingPassword ? 'Salvando...' : 'Confirmar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const InfoCard = ({ title, value, subtitle, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
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
    red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
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

export default Users;
