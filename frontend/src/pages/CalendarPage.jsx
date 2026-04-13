import { useMemo, useState } from 'react';

function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const monthYear = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }

    return days;
  }, [currentDate]);

  const changeMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  return (
    <div className='space-y-6'>
      {/* HEADER */}
      <div>
        <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
          ELO
        </p>
        <h1 className='text-3xl font-bold text-slate-800'>Calendário</h1>
        <p className='mt-1 text-slate-500'>
          Visualização de eventos, férias e integrações com Google e Outlook.
        </p>
      </div>

      {/* BOTÕES DE INTEGRAÇÃO */}
      <div className='grid gap-4 md:grid-cols-2'>
        <button className='rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md'>
          <p className='text-lg font-semibold text-slate-900'>
            🔗 Conectar Google Agenda
          </p>
          <p className='mt-1 text-sm text-slate-500'>
            Sincronize eventos automaticamente.
          </p>
        </button>

        <button className='rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md'>
          <p className='text-lg font-semibold text-slate-900'>
            🔗 Conectar Outlook
          </p>
          <p className='mt-1 text-sm text-slate-500'>
            Integração com agenda corporativa.
          </p>
        </button>
      </div>

      {/* CALENDÁRIO */}
      <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        {/* CONTROLES */}
        <div className='mb-6 flex items-center justify-between'>
          <button
            onClick={() => changeMonth(-1)}
            className='rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'
          >
            ←
          </button>

          <h2 className='text-xl font-bold capitalize text-slate-800'>
            {monthYear}
          </h2>

          <button
            onClick={() => changeMonth(1)}
            className='rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'
          >
            →
          </button>
        </div>

        {/* DIAS DA SEMANA */}
        <div className='grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500'>
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* DIAS */}
        <div className='mt-3 grid grid-cols-7 gap-2'>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`h-20 rounded-xl border text-sm flex items-start justify-start p-2 ${
                day
                  ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                  : 'bg-transparent border-none'
              }`}
            >
              {day && <span className='font-semibold'>{day}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* OBS */}
      <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-6 text-center text-sm text-slate-500'>
        Próximo passo: integração real com Google Calendar e Outlook + eventos
        de RH (férias, afastamentos, etc).
      </div>
    </div>
  );
}

export default CalendarPage;
