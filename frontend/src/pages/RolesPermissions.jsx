import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuthSession } from '../contexts/AuthSessionContext';

const initialProfileForm = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
  permissions: [],
};

const typeOptions = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'SYSTEM', label: 'Sistema' },
  { value: 'CUSTOM', label: 'Personalizados' },
];

const statusOptions = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'INATIVO', label: 'Inativos' },
];

const formatDateTime = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const RolesPermissions = () => {
  const { hasPermission } = useAuthSession();
  const [profiles, setProfiles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionsByModule, setPermissionsByModule] = useState({});
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalProfiles: 0,
    totalPermissions: 0,
    activeProfiles: 0,
    systemProfiles: 0,
    customProfiles: 0,
    withoutUsers: 0,
    mostPermissionsProfile: null,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [activeTab, setActiveTab] = useState('profiles');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState(initialProfileForm);
  const [saving, setSaving] = useState(false);
  const [managingUsersProfile, setManagingUsersProfile] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [savingUsers, setSavingUsers] = useState(false);

  const canReadProfiles = hasPermission('profiles.read');
  const canCreateProfiles = hasPermission('profiles.create');
  const canUpdateProfiles = hasPermission('profiles.update');
  const canAssignProfiles = hasPermission('profiles.assign');

  useEffect(() => {
    fetchPermissionsCatalog();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [search, typeFilter, statusFilter]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (typeFilter !== 'TODOS') params.type = typeFilter;
      if (statusFilter !== 'TODOS') params.status = statusFilter;

      const response = await api.get('/profiles', { params });
      setProfiles(response.data?.profiles || []);
      setSummary(
        response.data?.summary || {
          totalProfiles: 0,
          totalPermissions: 0,
          activeProfiles: 0,
          systemProfiles: 0,
          customProfiles: 0,
          withoutUsers: 0,
          mostPermissionsProfile: null,
        }
      );
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
      alert(error?.response?.data?.message || 'Não foi possível carregar os perfis.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsCatalog = async () => {
    try {
      const response = await api.get('/profiles/permissions/catalog');
      setPermissions(response.data?.permissions || []);
      setPermissionsByModule(response.data?.grouped || {});
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
      setPermissionsByModule({});
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Erro ao carregar usuários para perfis:', error);
      setUsers([]);
    }
  };

  const modulesSummary = useMemo(() => {
    return Object.entries(permissionsByModule)
      .map(([module, modulePermissions]) => ({
        module,
        count: modulePermissions.length,
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [permissionsByModule]);

  const openCreateDrawer = () => {
    setEditingProfile(null);
    setFormData(initialProfileForm);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name || '',
      slug: profile.slug || '',
      description: profile.description || '',
      isActive: Boolean(profile.isActive),
      permissions: Array.isArray(profile.permissions)
        ? profile.permissions.map((permission) => permission.key)
        : [],
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingProfile(null);
    setFormData(initialProfileForm);
    setIsDrawerOpen(false);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const togglePermissionSelection = (permissionKey) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter((item) => item !== permissionKey)
        : [...prev.permissions, permissionKey],
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert('Informe o nome do perfil.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        isActive: Boolean(formData.isActive),
        permissions: formData.permissions,
      };

      if (editingProfile) {
        await api.put(`/profiles/${editingProfile.id}`, payload);
      } else {
        await api.post('/profiles', payload);
      }

      closeDrawer();
      fetchProfiles();
      fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert(error?.response?.data?.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateProfile = async (profile) => {
    try {
      await api.post(`/profiles/${profile.id}/duplicate`);
      fetchProfiles();
    } catch (error) {
      console.error('Erro ao duplicar perfil:', error);
      alert(error?.response?.data?.message || 'Não foi possível duplicar o perfil.');
    }
  };

  const handleToggleStatus = async (profile) => {
    try {
      await api.patch(`/profiles/${profile.id}/status`, {
        isActive: !profile.isActive,
      });

      fetchProfiles();
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar status do perfil:', error);
      alert(error?.response?.data?.message || 'Não foi possível atualizar o status.');
    }
  };

  const openUsersManager = (profile) => {
    setManagingUsersProfile(profile);
    setSelectedUserIds(
      users
        .filter((user) =>
          Array.isArray(user.profiles)
            ? user.profiles.some((userProfile) => userProfile.id === profile.id)
            : false
        )
        .map((user) => user.id)
    );
  };

  const closeUsersManager = () => {
    setManagingUsersProfile(null);
    setSelectedUserIds([]);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((item) => item !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveUsersManager = async (event) => {
    event.preventDefault();

    if (!managingUsersProfile) return;

    try {
      setSavingUsers(true);

      const updates = users.map(async (user) => {
        const currentProfileIds = Array.isArray(user.profiles)
          ? user.profiles.map((profile) => profile.id)
          : [];

        const shouldHaveProfile = selectedUserIds.includes(user.id);
        const alreadyHasProfile = currentProfileIds.includes(managingUsersProfile.id);

        let nextProfileIds = currentProfileIds;

        if (shouldHaveProfile && !alreadyHasProfile) {
          nextProfileIds = [...currentProfileIds, managingUsersProfile.id];
        }

        if (!shouldHaveProfile && alreadyHasProfile) {
          nextProfileIds = currentProfileIds.filter(
            (profileId) => profileId !== managingUsersProfile.id
          );
        }

        if (
          nextProfileIds.length === 0 ||
          JSON.stringify(nextProfileIds.sort((a, b) => a - b)) ===
            JSON.stringify(currentProfileIds.sort((a, b) => a - b))
        ) {
          return null;
        }

        return api.patch(`/users/${user.id}/profiles`, {
          profileIds: nextProfileIds,
        });
      });

      await Promise.all(updates);
      closeUsersManager();
      fetchProfiles();
      fetchUsers();
    } catch (error) {
      console.error('Erro ao vincular usuários ao perfil:', error);
      alert(error?.response?.data?.message || 'Não foi possível atualizar os usuários do perfil.');
    } finally {
      setSavingUsers(false);
    }
  };

  const renderProfilesList = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando perfis...
        </div>
      );
    }

    if (profiles.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Nenhum perfil encontrado.
        </div>
      );
    }

    return (
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-6 py-5'>
          <h3 className='text-xl font-semibold text-slate-800'>Lista de perfis</h3>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            <thead className='bg-slate-50'>
              <tr className='text-left'>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Perfil
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Tipo
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Status
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Permissões
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Usuários
                </th>
                <th className='px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Atualização
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {profiles.map((profile) => (
                <tr key={profile.id} className='hover:bg-slate-50/70'>
                  <td className='px-6 py-5'>
                    <div>
                      <p className='font-semibold text-slate-800'>{profile.name}</p>
                      <p className='mt-1 text-sm text-slate-500'>{profile.slug}</p>
                    </div>
                  </td>
                  <td className='px-6 py-5'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        profile.isSystem
                          ? 'border border-violet-200 bg-violet-50 text-violet-700'
                          : 'border border-cyan-200 bg-cyan-50 text-cyan-700'
                      }`}
                    >
                      {profile.isSystem ? 'Sistema' : 'Personalizado'}
                    </span>
                  </td>
                  <td className='px-6 py-5'>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        profile.isActive
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {profile.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className='px-6 py-5 text-sm font-semibold text-slate-800'>
                    {profile.permissionCount}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {profile.userCount}
                  </td>
                  <td className='px-6 py-5 text-sm text-slate-700'>
                    {formatDateTime(profile.updatedAt)}
                  </td>
                  <td className='px-6 py-5'>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {canUpdateProfiles ? (
                        <MiniActionButton
                          label='Editar'
                          tone='blue'
                          onClick={() => openEditDrawer(profile)}
                        />
                      ) : null}

                      {canCreateProfiles ? (
                        <MiniActionButton
                          label='Duplicar'
                          tone='violet'
                          onClick={() => handleDuplicateProfile(profile)}
                        />
                      ) : null}

                      {canUpdateProfiles ? (
                        <MiniActionButton
                          label={profile.isActive ? 'Inativar' : 'Ativar'}
                          tone='amber'
                          onClick={() => handleToggleStatus(profile)}
                        />
                      ) : null}

                      {canAssignProfiles ? (
                        <MiniActionButton
                          label='Usuários'
                          tone='slate'
                          onClick={() => openUsersManager(profile)}
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

  const renderProfilesCards = () => {
    if (loading) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm'>
          Carregando perfis...
        </div>
      );
    }

    return (
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-900 px-5 py-5 text-white'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200'>
                    {profile.isSystem ? 'Perfil de sistema' : 'Perfil personalizado'}
                  </p>
                  <h3 className='mt-2 text-2xl font-bold'>{profile.name}</h3>
                  <p className='mt-1 text-sm text-slate-300'>{profile.slug}</p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    profile.isActive
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {profile.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            <div className='space-y-5 p-5'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <InfoBox label='Descrição' value={profile.description || '-'} />
                <InfoBox label='Permissões' value={String(profile.permissionCount)} />
                <InfoBox label='Usuários vinculados' value={String(profile.userCount)} />
                <InfoBox label='Última atualização' value={formatDateTime(profile.updatedAt)} />
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-700'>Permissões por módulo</p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {Array.from(
                    new Set(profile.permissions.map((permission) => permission.module))
                  ).map((module) => (
                    <span
                      key={module}
                      className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </div>

              {profile.users.length > 0 ? (
                <div className='rounded-2xl border border-blue-200 bg-blue-50 p-4'>
                  <p className='text-sm text-blue-700'>Usuários vinculados</p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {profile.users.slice(0, 4).map((user) => (
                      <span
                        key={user.id}
                        className='rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800'
                      >
                        {user.name || user.email}
                      </span>
                    ))}
                    {profile.users.length > 4 ? (
                      <span className='rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800'>
                        +{profile.users.length - 4}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className='rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700'>
                  Perfil sem usuários vinculados no momento.
                </div>
              )}

              <div className='flex flex-wrap gap-3'>
                {canUpdateProfiles ? (
                  <ActionButton label='Editar perfil' tone='blue' onClick={() => openEditDrawer(profile)} />
                ) : null}
                {canCreateProfiles ? (
                  <ActionButton label='Duplicar perfil' tone='violet' onClick={() => handleDuplicateProfile(profile)} />
                ) : null}
                {canAssignProfiles ? (
                  <ActionButton label='Gerenciar usuários' tone='slate' onClick={() => openUsersManager(profile)} />
                ) : null}
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
                Autorização centralizada
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Perfis e Permissões
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Estruture acesso por perfil, permissões por módulo e usuários vinculados
                com base segura e escalável para o EloSystem.
              </p>
            </div>

            {canCreateProfiles ? (
              <div className='flex flex-wrap gap-3'>
                <button
                  type='button'
                  onClick={openCreateDrawer}
                  className='rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.03] hover:bg-slate-100'
                >
                  + Novo perfil
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-6'>
          <InfoCard title='Perfis' value={summary.totalProfiles} subtitle='Estruturas cadastradas' tone='slate' />
          <InfoCard title='Permissões' value={summary.totalPermissions} subtitle='Chaves de acesso mapeadas' tone='blue' />
          <InfoCard title='Ativos' value={summary.activeProfiles} subtitle='Perfis habilitados' tone='green' />
          <InfoCard title='Sistema' value={summary.systemProfiles} subtitle='Perfis nativos protegidos' tone='violet' />
          <InfoCard title='Personalizados' value={summary.customProfiles} subtitle='Perfis flexíveis da operação' tone='orange' />
          <InfoCard title='Sem usuários' value={summary.withoutUsers} subtitle='Perfis ainda não atribuídos' tone='amber' />
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Buscar perfil</label>
              <input
                type='text'
                placeholder='Buscar por nome, chave ou descrição'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-semibold text-slate-700'>Tipo</label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
              >
                {typeOptions.map((option) => (
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
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('profiles')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'profiles'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Perfis
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('permissions')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'permissions'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Permissões
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('matrix')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'matrix'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Matriz de acesso
            </button>
          </div>
        </div>

        {activeTab === 'profiles' && (
          <>
            {renderProfilesList()}
            {profiles.length > 0 ? renderProfilesCards() : null}
          </>
        )}

        {activeTab === 'permissions' && (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            {modulesSummary.map((module) => (
              <div
                key={module.module}
                className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'
              >
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                      Módulo
                    </p>
                    <h3 className='mt-2 text-2xl font-bold text-slate-900'>{module.module}</h3>
                  </div>

                  <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700'>
                    {module.count} permissões
                  </span>
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                  {(permissionsByModule[module.module] || []).map((permission) => (
                    <div
                      key={permission.key}
                      className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'
                    >
                      <p className='font-semibold'>{permission.key}</p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {permission.description || 'Permissão sem descrição adicional.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'matrix' && (
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                  Leitura gerencial
                </p>
                <h3 className='mt-2 text-2xl font-bold text-slate-900'>Matriz de acesso</h3>
                <p className='mt-2 text-sm text-slate-500'>
                  Visão consolidada por perfil e quantidade de permissões agrupadas por módulo.
                </p>
              </div>

              {summary.mostPermissionsProfile ? (
                <div className='rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-blue-500'>
                    Maior cobertura
                  </p>
                  <p className='mt-1 text-lg font-bold text-blue-900'>
                    {summary.mostPermissionsProfile.name}
                  </p>
                </div>
              ) : null}
            </div>

            <div className='mt-6 overflow-x-auto'>
              <table className='min-w-full'>
                <thead className='bg-slate-50'>
                  <tr className='text-left'>
                    <th className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Perfil
                    </th>
                    {modulesSummary.map((module) => (
                      <th
                        key={module.module}
                        className='px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500'
                      >
                        {module.module}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className='px-4 py-4 font-semibold text-slate-800'>
                        {profile.name}
                      </td>
                      {modulesSummary.map((module) => {
                        const count = profile.permissions.filter(
                          (permission) => permission.module === module.module
                        ).length;

                        return (
                          <td key={`${profile.id}-${module.module}`} className='px-4 py-4'>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                count > 0
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              {count}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeDrawer}
          />

          <div className='relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
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
                      Autorização do sistema
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {editingProfile ? 'Editar perfil' : 'Novo perfil'}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Estruture responsabilidades, permissões por módulo e o comportamento
                      de acesso do sistema.
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

            <form onSubmit={handleSaveProfile} className='flex min-h-0 flex-1 flex-col'>
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Nome do perfil
                        </label>
                        <input
                          type='text'
                          name='name'
                          value={formData.name}
                          onChange={handleFormChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Ex: RH Operacional'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Chave / slug
                        </label>
                        <input
                          type='text'
                          name='slug'
                          value={formData.slug}
                          onChange={handleFormChange}
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-500'
                          placeholder='EX: RH_OPERACIONAL'
                          disabled={Boolean(editingProfile?.isSystem)}
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Descrição
                        </label>
                        <textarea
                          name='description'
                          value={formData.description}
                          onChange={handleFormChange}
                          rows='4'
                          className='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                          placeholder='Explique o escopo de acesso e a finalidade do perfil.'
                        />
                      </div>

                      <div className='md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                        <label className='flex items-center gap-3 text-sm font-semibold text-slate-700'>
                          <input
                            type='checkbox'
                            name='isActive'
                            checked={formData.isActive}
                            onChange={handleFormChange}
                            className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                          />
                          Perfil ativo para atribuição e uso no sistema
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>Permissões por módulo</h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione as ações que esse perfil poderá executar no EloSystem.
                      </p>
                    </div>

                    <div className='space-y-5'>
                      {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                        <div key={module} className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                          <div className='mb-3 flex items-center justify-between gap-4'>
                            <div>
                              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
                                Módulo
                              </p>
                              <h4 className='mt-1 text-lg font-bold text-slate-900'>{module}</h4>
                            </div>

                            <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
                              {
                                modulePermissions.filter((permission) =>
                                  formData.permissions.includes(permission.key)
                                ).length
                              }
                              /{modulePermissions.length}
                            </span>
                          </div>

                          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                            {modulePermissions.map((permission) => (
                              <label
                                key={permission.key}
                                className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700'
                              >
                                <input
                                  type='checkbox'
                                  checked={formData.permissions.includes(permission.key)}
                                  onChange={() => togglePermissionSelection(permission.key)}
                                  className='mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                                />

                                <span>
                                  <span className='block font-semibold text-slate-900'>{permission.key}</span>
                                  <span className='mt-1 block text-xs text-slate-500'>
                                    {permission.description || 'Permissão sem descrição complementar.'}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
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
                      ? editingProfile
                        ? 'Salvando...'
                        : 'Criando...'
                      : editingProfile
                        ? 'Salvar perfil'
                        : 'Criar perfil'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingUsersProfile && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeUsersManager}
          />

          <div className='relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'>
                  Usuários vinculados
                </div>
                <h3 className='text-2xl font-bold text-slate-800'>
                  {managingUsersProfile.name}
                </h3>
                <p className='mt-1 text-sm text-slate-500'>
                  Marque os usuários que devem receber esse perfil. O sistema mantém
                  vínculo seguro entre perfil e conta de acesso.
                </p>
              </div>

              <button
                type='button'
                onClick={closeUsersManager}
                className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUsersManager} className='mt-6 space-y-5'>
              <div className='grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1'>
                {users.map((user) => (
                  <label
                    key={user.id}
                    className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <input
                      type='checkbox'
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className='mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                    />

                    <span className='flex-1'>
                      <span className='block font-semibold text-slate-900'>
                        {user.name || user.email}
                      </span>
                      <span className='mt-1 block text-sm text-slate-500'>
                        {user.email}
                      </span>
                      <span className='mt-1 block text-xs text-slate-500'>
                        Perfil principal atual: {user.primaryProfile || user.role}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className='flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={closeUsersManager}
                  className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Cancelar
                </button>

                <button
                  type='submit'
                  disabled={savingUsers}
                  className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {savingUsers ? 'Salvando vínculos...' : 'Salvar usuários'}
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
    violet: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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
    slate: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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

export default RolesPermissions;
