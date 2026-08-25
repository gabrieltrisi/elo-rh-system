import { useMemo, useState } from 'react';
import { getHelpForPage } from '../../data/helpContent';

function PageHelpCard({ currentPage, onOpenHelp }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const help = useMemo(() => getHelpForPage(currentPage), [currentPage]);

  if (!help || currentPage === 'help') {
    return null;
  }

  const quickSteps = help.steps.slice(0, 3);
  const quickTips = help.bestPractices.slice(0, 2);

  return (
    <div className='mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white shadow-sm'>
      <div className='flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold uppercase tracking-[0.24em] text-blue-200'>
            Guia rapido do modulo
          </p>
          <div className='mt-2 text-xl font-bold'>
            Como usar: {help.title}
          </div>
          <p className='mt-2 max-w-4xl text-sm leading-6 text-slate-200'>
            {help.summary}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={() => setIsExpanded((prev) => !prev)}
            className='rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15'
          >
            {isExpanded ? 'Ocultar passo a passo' : 'Ver passo a passo'}
          </button>
          <button
            type='button'
            onClick={onOpenHelp}
            className='rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-blue-50'
          >
            Abrir guia completo
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className='grid gap-4 border-t border-white/10 bg-white/[0.04] p-5 lg:grid-cols-[1.2fr_0.8fr]'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-blue-200'>
              Fluxo recomendado
            </p>
            <div className='mt-4 grid gap-3'>
              {quickSteps.map((step, index) => (
                <div
                  key={`${help.page}-step-${step}`}
                  className='flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-3'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white'>
                    {index + 1}
                  </span>
                  <p className='text-sm leading-6 text-slate-100'>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200'>
              Boas praticas
            </p>
            <div className='mt-4 grid gap-3'>
              {quickTips.map((tip) => (
                <div
                  key={`${help.page}-tip-${tip}`}
                  className='rounded-2xl border border-emerald-200/15 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-50'
                >
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PageHelpCard;
