import { useMemo, useState } from 'react';
import {
  getAllHelpModules,
  getFeaturedHelpModules,
  helpSections,
} from '../data/helpContent';
import goLiveReadiness from '../data/goLiveReadiness';

function HelpCenter({ onNavigate }) {
  const allModules = useMemo(() => getAllHelpModules(), []);
  const featuredModules = useMemo(() => getFeaturedHelpModules(), []);
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState(
    featuredModules[0]?.page || allModules[0]?.page
  );

  const selectedModule = useMemo(
    () =>
      allModules.find((module) => module.page === selectedPage) ||
      allModules[0],
    [allModules, selectedPage]
  );

  const filteredModules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allModules;
    }

    return allModules.filter((module) => {
      const searchableText = [
        module.title,
        module.sectionTitle,
        module.summary,
        module.objective,
        module.whenToUse,
        module.audience,
        ...(module.keywords || []),
        ...(module.steps || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [allModules, search]);

  const metrics = [
    {
      label: 'Modulos documentados',
      value: allModules.length,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    {
      label: 'Areas do sistema',
      value: helpSections.length,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Guias prioritarios',
      value: featuredModules.length,
      tone: 'text-amber-700 bg-amber-50 border-amber-100',
    },
    {
      label: 'Busca interna',
      value: filteredModules.length,
      tone: 'text-violet-700 bg-violet-50 border-violet-100',
    },
  ];

  return (
    <div className='space-y-8'>
      <section className='overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl'>
        <div className='grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-blue-200'>
              Adoção e suporte interno
            </p>
            <h2 className='mt-4 text-4xl font-black tracking-tight'>
              Central de Ajuda EloSystem
            </h2>
            <p className='mt-4 max-w-3xl text-lg leading-8 text-slate-200'>
              Guias operacionais para RH, DP, gestores e diretoria entenderem o
              que cada modulo faz, quando usar e qual fluxo seguir.
            </p>
            <div className='mt-7 flex flex-wrap gap-3'>
              <span className='rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100'>
                Ajuda contextual
              </span>
              <span className='rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100'>
                Passo a passo operacional
              </span>
              <span className='rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100'>
                Boas praticas por modulo
              </span>
            </div>
          </div>

          <div className='rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm'>
            <p className='text-sm font-semibold text-blue-100'>
              Como usar esta central
            </p>
            <div className='mt-4 space-y-3'>
              {[
                'Pesquise por modulo, termo ou rotina.',
                'Abra o guia e siga o fluxo recomendado.',
                'Use o assistente flutuante para duvidas da pagina atual.',
              ].map((step, index) => (
                <div
                  key={`help-hero-step-${step}`}
                  className='flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-3'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950'>
                    {index + 1}
                  </span>
                  <p className='text-sm leading-6 text-slate-100'>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-3xl border p-5 shadow-sm ${metric.tone}`}
          >
            <p className='text-sm font-medium opacity-80'>{metric.label}</p>
            <p className='mt-3 text-4xl font-black'>{metric.value}</p>
          </div>
        ))}
      </section>

      <section className='overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm'>
        <div className='grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-7 text-white xl:grid-cols-[1fr_0.9fr]'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200'>
              Implantacao interna
            </p>
            <h3 className='mt-3 text-3xl font-black'>
              {goLiveReadiness.title}
            </h3>
            <p className='mt-3 max-w-3xl text-sm leading-7 text-slate-200'>
              {goLiveReadiness.subtitle}
            </p>
          </div>

          <div className='rounded-3xl border border-white/10 bg-white/10 p-5'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-blue-100'>
              Relatorios uteis para acompanhar
            </p>
            <div className='mt-4 grid gap-2 sm:grid-cols-2'>
              {goLiveReadiness.usefulReports.map((report) => (
                <span
                  key={`go-live-report-${report}`}
                  className='rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100'
                >
                  {report}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className='grid gap-5 p-6 xl:grid-cols-[0.85fr_1.15fr]'>
          <div className='space-y-4'>
            {goLiveReadiness.pilotUsers.map((user) => (
              <div
                key={`go-live-user-${user.role}`}
                className='rounded-3xl border border-slate-200 bg-slate-50 p-5'
              >
                <p className='text-sm font-black text-slate-950'>
                  {user.role}
                </p>
                <p className='mt-2 text-sm leading-6 text-slate-600'>
                  {user.focus}
                </p>
                <div className='mt-4 space-y-2'>
                  {user.firstActions.map((action) => (
                    <div
                      key={`go-live-action-${user.role}-${action}`}
                      className='rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600'
                    >
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {goLiveReadiness.checklists.map((checklist) => (
              <div
                key={`go-live-checklist-${checklist.key}`}
                className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'
              >
                <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-400'>
                  Checklist
                </p>
                <h4 className='mt-2 text-lg font-black text-slate-950'>
                  {checklist.title}
                </h4>
                <div className='mt-4 space-y-3'>
                  {checklist.items.map((item) => (
                    <div
                      key={`go-live-item-${checklist.key}-${item}`}
                      className='flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700'
                    >
                      <span className='mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500' />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='grid gap-4 lg:grid-cols-[1fr_260px] lg:items-end'>
          <label className='block'>
            <span className='text-sm font-semibold text-slate-800'>
              Buscar ajuda
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Buscar por holerite, importar ponto, permissao, documento...'
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100'
            />
          </label>

          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
              Resultado
            </p>
            <p className='mt-1 text-lg font-bold text-slate-900'>
              {filteredModules.length} guia(s)
            </p>
          </div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-[360px_1fr]'>
        <div className='space-y-4'>
          {helpSections.map((section) => {
            const sectionModules = filteredModules.filter(
              (module) => module.sectionKey === section.key
            );

            if (sectionModules.length === 0) {
              return null;
            }

            return (
              <div
                key={section.key}
                className='rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm'
              >
                <div className='mb-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-slate-400'>
                    {section.title}
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-500'>
                    {section.description}
                  </p>
                </div>

                <div className='space-y-2'>
                  {sectionModules.map((module) => (
                    <button
                      key={`help-menu-${module.page}`}
                      type='button'
                      onClick={() => setSelectedPage(module.page)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedModule?.page === module.page
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className='block text-sm font-bold'>
                        {module.title}
                      </span>
                      <span className='mt-1 block truncate text-xs opacity-70'>
                        {module.audience}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedModule ? (
          <article className='overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm'>
            <div className='bg-slate-950 p-7 text-white'>
              <p className='text-xs font-semibold uppercase tracking-[0.24em] text-blue-200'>
                {selectedModule.sectionTitle}
              </p>
              <div className='mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                <div>
                  <h3 className='text-3xl font-black'>
                    {selectedModule.title}
                  </h3>
                  <p className='mt-3 max-w-3xl text-base leading-7 text-slate-200'>
                    {selectedModule.summary}
                  </p>
                </div>

                {onNavigate ? (
                  <button
                    type='button'
                    onClick={() => onNavigate(selectedModule.page)}
                    className='rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-blue-50'
                  >
                    Abrir modulo
                  </button>
                ) : null}
              </div>
            </div>

            <div className='grid gap-5 p-7 lg:grid-cols-2'>
              <InfoBlock title='Objetivo' text={selectedModule.objective} />
              <InfoBlock
                title='Quando usar'
                text={selectedModule.whenToUse}
              />
            </div>

            <div className='grid gap-6 border-t border-slate-100 p-7 xl:grid-cols-[1fr_0.9fr]'>
              <div>
                <SectionTitle title='Fluxo recomendado' />
                <div className='mt-4 space-y-3'>
                  {selectedModule.steps.map((step, index) => (
                    <div
                      key={`${selectedModule.page}-detail-step-${step}`}
                      className='flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white'>
                        {index + 1}
                      </span>
                      <p className='text-sm leading-6 text-slate-700'>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className='space-y-6'>
                <ListBlock
                  title='Boas praticas'
                  tone='emerald'
                  items={selectedModule.bestPractices}
                />
                <ListBlock
                  title='Erros comuns'
                  tone='amber'
                  items={selectedModule.commonMistakes}
                />
              </div>
            </div>

            <div className='border-t border-slate-100 p-7'>
              <SectionTitle title='Duvidas rapidas' />
              <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                {selectedModule.faq.map((item) => (
                  <div
                    key={`${selectedModule.page}-faq-${item.question}`}
                    className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                  >
                    <p className='font-bold text-slate-900'>
                      {item.question}
                    </p>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ) : (
          <div className='rounded-[32px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center'>
            <p className='text-lg font-bold text-slate-800'>
              Nenhum guia encontrado
            </p>
            <p className='mt-2 text-sm text-slate-500'>
              Tente buscar por outro termo ou limpe o campo de pesquisa.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <p className='text-xs font-bold uppercase tracking-[0.22em] text-slate-400'>
      {title}
    </p>
  );
}

function InfoBlock({ title, text }) {
  return (
    <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
      <SectionTitle title={title} />
      <p className='mt-3 text-sm leading-7 text-slate-700'>{text}</p>
    </div>
  );
}

function ListBlock({ title, items, tone }) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
      : 'border-amber-100 bg-amber-50 text-amber-900';

  return (
    <div>
      <SectionTitle title={title} />
      <div className='mt-4 space-y-3'>
        {items.map((item) => (
          <div
            key={`${title}-${item}`}
            className={`rounded-2xl border p-4 text-sm leading-6 ${toneClasses}`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default HelpCenter;
