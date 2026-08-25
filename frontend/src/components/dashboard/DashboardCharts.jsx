import React, { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow ? (
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>
          {eyebrow}
        </p>
      ) : null}
      <h2 className='mt-2 text-xl font-bold text-slate-900'>{title}</h2>
      <p className='mt-1 text-sm text-slate-500'>{description}</p>
    </div>
  );
}

function FilterBtn({ label, value, filter, setFilter }) {
  return (
    <button
      type='button'
      onClick={() => setFilter(value)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        filter === value
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function SafeChartContainer({ height, children }) {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const isAutomatedBrowser =
    typeof window !== 'undefined' && window.navigator?.webdriver;

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return undefined;

    const updateSizeState = () => {
      const nextReady =
        element.clientWidth > 0 && element.clientHeight > 0;
      setIsReady(nextReady);
    };

    updateSizeState();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateSizeState();
      });

      observer.observe(element);

      return () => observer.disconnect();
    }

    const frame = window.requestAnimationFrame(updateSizeState);
    window.addEventListener('resize', updateSizeState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateSizeState);
    };
  }, []);

  if (isAutomatedBrowser) {
    return <div style={{ width: '100%', height, minHeight: height }} />;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height, minHeight: height }}>
      {isReady ? (
        children
      ) : (
        <div
          className='overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5'
          style={{ width: '100%', height }}
        >
          <div className='flex h-full items-end gap-3'>
            {[38, 54, 70, 46, 66, 58].map((size, index) => (
              <div key={`chart-ready-skeleton-${index}`} className='flex-1'>
                <div
                  className='w-full animate-pulse rounded-t-2xl bg-slate-200'
                  style={{ height: `${size}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCharts({
  chartData,
  filter,
  monthlyData,
  setFilter,
  variant = 'employeeIndicators',
}) {
  if (variant === 'monthlyCertificates') {
    return (
      <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <SectionHeader
          eyebrow='Historico'
          title='Evolucao mensal de atestados'
          description='Volume registrado mes a mes com visao comparativa do periodo.'
        />

        <div className='mt-4'>
          <SafeChartContainer height={300}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={monthlyData}>
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => props?.payload?.value ?? 0}
                />
                <Bar
                  dataKey='plotValue'
                  fill='#22c55e'
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      </div>
    );
  }

  return (
    <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <h2 className='text-xl font-bold text-slate-900'>
            Indicadores por colaborador
          </h2>
          <p className='mt-1 text-sm text-slate-500'>
            Compare incidencia, recorrencia e concentracao por modulo
            selecionado.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <FilterBtn
            label='Atestados'
            value='atestados'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Advertencias'
            value='advertencias'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Ferias'
            value='ferias'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Suspensoes'
            value='suspensoes'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Afastamentos'
            value='afastamentos'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Onboarding'
            value='onboarding'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Documentos'
            value='documentos'
            filter={filter}
            setFilter={setFilter}
          />
          <FilterBtn
            label='Fardamento'
            value='fardamento'
            filter={filter}
            setFilter={setFilter}
          />
        </div>
      </div>

      <SafeChartContainer height={340}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={chartData}>
            <XAxis dataKey='name' />
            <YAxis />
            <Tooltip
              formatter={(value, name, props) => props?.payload?.rawValue ?? 0}
            />
            <Bar dataKey='value' fill='#2563eb' radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SafeChartContainer>
    </div>
  );
}

export default DashboardCharts;
