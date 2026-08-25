const defaultHighlights = [
  {
    title: 'Base estrutural pronta',
    value: '100%',
    subtitle: 'Arquitetura preparada para evolucao do modulo',
    tone: 'slate',
  },
  {
    title: 'Fluxos previstos',
    value: '4',
    subtitle: 'Blocos reservados para operacao, fechamento e historico',
    tone: 'blue',
  },
  {
    title: 'Integracoes futuras',
    value: '3',
    subtitle: 'Espaco reservado para conectores e automacoes',
    tone: 'emerald',
  },
];

const toneClasses = {
  slate: 'border-slate-200 bg-white text-slate-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
};

function PremiumModulePlaceholder({
  eyebrow = 'Modulo estrategico',
  title,
  description,
  actionLabel = 'Planejamento em andamento',
  accent = 'from-slate-950 via-slate-900 to-slate-700',
  highlights = defaultHighlights,
  pillars = [],
}) {
  return (
    <div className='space-y-8'>
      <section
        className={`overflow-hidden rounded-[32px] bg-gradient-to-r ${accent} p-8 text-white shadow-xl`}
      >
        <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.25em] text-slate-200'>
              {eyebrow}
            </p>
            <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>{title}</h1>
            <p className='mt-4 text-lg text-slate-200'>{description}</p>
          </div>

          <div className='rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm'>
            {actionLabel}
          </div>
        </div>
      </section>

      <section className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {highlights.map((item) => (
          <article
            key={item.title}
            className={`rounded-2xl border p-5 shadow-sm ${toneClasses[item.tone] || toneClasses.slate}`}
          >
            <p className='text-sm opacity-75'>{item.title}</p>
            <h2 className='mt-2 text-3xl font-bold'>{item.value}</h2>
            <p className='mt-2 text-sm opacity-75'>{item.subtitle}</p>
          </article>
        ))}
      </section>

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-400'>
                Roadmap reservado
              </p>
              <h2 className='mt-2 text-2xl font-bold text-slate-900'>
                Estrutura pronta para expansao
              </h2>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-400'>
                Status
              </p>
              <p className='mt-1 text-sm font-semibold text-slate-700'>
                Base ativa
              </p>
            </div>
          </div>

          <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
              >
                <p className='text-sm font-semibold text-slate-500'>
                  {pillar.title}
                </p>
                <p className='mt-2 text-base font-semibold text-slate-900'>
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
          <p className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-400'>
            Area reservada
          </p>
          <h2 className='mt-2 text-2xl font-bold text-slate-900'>
            Proximas entregas do modulo
          </h2>

          <div className='mt-6 space-y-4'>
            {pillars.slice(0, 3).map((pillar, index) => (
              <div
                key={`${pillar.title}-${index}`}
                className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4'
              >
                <p className='text-sm font-semibold text-slate-800'>
                  {pillar.title}
                </p>
                <p className='mt-1 text-sm text-slate-500'>
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PremiumModulePlaceholder;
