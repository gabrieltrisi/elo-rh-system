import { useState } from 'react';
import { motion } from 'framer-motion';
import logoElo from '../assets/logo-elo.jpeg.png';

function Layout({
  children,
  onLogout,
  onNavigate,
  currentPage,
  pendingCertificates = 0,
  warningCount = 0,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    administrativo: true,
    pontoHoras: false,
    ocorrencias: true,
    gestao: true,
  });

  const toggleGroup = (groupKey) => {
    if (isCollapsed) return;

    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const groups = [
    {
      key: 'administrativo',
      title: 'Administrativo',
      accent: 'from-blue-500/20 to-cyan-400/10',
      items: [
        { key: 'employees', label: 'Colaboradores', icon: '👥' },
        { key: 'stock', label: 'Fardamento', icon: '👔' },
        { key: 'documents', label: 'Documentação / Arquivos', icon: '📂' },
        { key: 'benefits', label: 'Benefícios', icon: '🎁' },
        { key: 'onboarding', label: 'Integração (Onboarding)', icon: '🚀' },
      ],
    },
    {
      key: 'pontoHoras',
      title: 'Ponto e Horas',
      accent: 'from-violet-500/20 to-fuchsia-400/10',
      items: [
        { key: 'timesheet', label: 'Folha de Ponto', icon: '🕘' },
        { key: 'bankHours', label: 'Banco de Horas', icon: '⏳' },
      ],
    },
    {
      key: 'ocorrencias',
      title: 'Ocorrências',
      accent: 'from-amber-500/20 to-orange-400/10',
      items: [
        {
          key: 'certificates',
          label: 'Atestados',
          icon: '🩺',
          badge: pendingCertificates,
        },
        {
          key: 'warnings',
          label: 'Advertências',
          icon: '⚠️',
          badge: warningCount,
        },
        { key: 'leave', label: 'Afastamentos', icon: '📅' },
        { key: 'suspensions', label: 'Suspensões', icon: '⛔' },
      ],
    },
    {
      key: 'gestao',
      title: 'Gestão',
      accent: 'from-emerald-500/20 to-teal-400/10',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: '📊' },
        { key: 'vacations', label: 'Férias', icon: '🌴' },
        { key: 'calendar', label: 'Calendário', icon: '🗓️' },
      ],
    },
  ];

  const pageTitles = {
    dashboard: 'Visão Geral',
    employees: 'Colaboradores',
    stock: 'Fardamento',
    documents: 'Documentação / Arquivos',
    benefits: 'Benefícios',
    onboarding: 'Integração (Onboarding)',
    vacations: 'Férias',
    calendar: 'Calendário',
    timesheet: 'Folha de Ponto',
    bankHours: 'Banco de Horas',
    certificates: 'Atestados',
    warnings: 'Advertências',
    leave: 'Afastamentos',
    suspensions: 'Suspensões',
  };

  return (
    <div className='min-h-screen bg-slate-100 flex'>
      <motion.aside
        animate={{ width: isCollapsed ? 104 : 340 }}
        transition={{ duration: 0.25 }}
        className='bg-gradient-to-b from-[#06112a] via-[#081734] to-[#0b1736] text-slate-100 p-5 flex flex-col border-r border-slate-900 overflow-hidden shadow-2xl'
      >
        <div className='mb-6 flex items-start justify-between gap-3'>
          {!isCollapsed && (
            <div className='flex-1'>
              <div className='rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]'>
                <img
                  src={logoElo}
                  alt='ELO'
                  className='w-full h-auto object-contain rounded-2xl'
                />
              </div>

              <div className='mt-4 px-1 flex items-center justify-between'>
                <div>
                  <p className='text-[11px] uppercase tracking-[0.30em] text-slate-400'>
                    Plataforma interna
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    Gestão de pessoas e processos
                  </p>
                </div>

                <span className='text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 font-semibold'>
                  Online
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='shrink-0 bg-white/10 hover:bg-white/20 transition rounded-2xl px-3 py-2.5 text-sm border border-white/10'
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className='flex flex-col gap-4'>
          {groups.map((group, index) => {
            const isOpen = openGroups[group.key];

            return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className='rounded-3xl border border-white/5 bg-white/[0.03] p-2.5 shadow-lg'
              >
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-3.5 rounded-2xl text-left transition bg-gradient-to-r ${group.accent} hover:bg-white/5`}
                >
                  <span className='text-sm font-semibold text-slate-100 tracking-wide truncate'>
                    {isCollapsed ? group.title.charAt(0) : group.title}
                  </span>

                  {!isCollapsed && (
                    <span
                      className={`text-slate-400 text-lg transition-transform duration-200 ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    >
                      ›
                    </span>
                  )}
                </button>

                {!isCollapsed && isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                    className='mt-2 ml-2 flex flex-col gap-1.5 border-l border-white/10 pl-3 overflow-hidden'
                  >
                    {group.items.map((item) => {
                      const isActive = currentPage === item.key;
                      const badgeValue = item.badge || 0;

                      return (
                        <button
                          key={item.key}
                          onClick={() => onNavigate(item.key)}
                          className={`w-full flex items-center justify-between text-left px-3 py-3 rounded-2xl text-sm transition ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className='flex items-center gap-3'>
                            <span className='text-base'>{item.icon}</span>
                            <span>{item.label}</span>
                          </span>

                          {badgeValue > 0 && (
                            <span className='ml-3 min-w-[24px] h-[24px] px-2 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm'>
                              {badgeValue}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </nav>

        <div className='mt-auto pt-8'>
          <div className='rounded-3xl border border-white/10 bg-white/[0.03] p-3 shadow-lg'>
            <button
              onClick={onLogout}
              className='w-full bg-red-500 hover:bg-red-600 transition px-4 py-3 rounded-2xl font-medium shadow-lg shadow-red-950/30'
            >
              {isCollapsed ? '×' : 'Sair'}
            </button>
          </div>
        </div>
      </motion.aside>

      <main className='flex-1 p-8 bg-slate-100'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='mb-6 flex items-center justify-between'
        >
          <div>
            <p className='text-sm text-slate-400 uppercase tracking-[0.2em]'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-900 mt-1'>
              {pageTitles[currentPage] || 'Painel'}
            </h1>
          </div>

          <div className='bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold'>
              A
            </div>
            <div>
              <p className='text-sm font-medium text-slate-800'>Admin</p>
              <p className='text-xs text-slate-500'>Acesso interno</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='bg-white rounded-3xl shadow-sm min-h-[calc(100vh-9rem)] p-8 border border-slate-200'
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export default Layout;
