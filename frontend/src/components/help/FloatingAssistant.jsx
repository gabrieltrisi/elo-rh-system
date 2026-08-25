import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getHelpForPage } from '../../data/helpContent';
import api from '../../services/api';

function FloatingAssistant({ currentPage, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('PROBLEMA');
  const [feedbackPriority, setFeedbackPriority] = useState('MEDIA');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const help = useMemo(() => getHelpForPage(currentPage), [currentPage]);
  const quickSteps = help.steps.slice(0, 4);
  const quickFaq = help.faq.slice(0, 3);

  const handleSendFeedback = async (event) => {
    event.preventDefault();

    const message = feedbackMessage.trim();

    if (message.length < 8) {
      toast.error('Descreva o feedback com um pouco mais de contexto.');
      return;
    }

    setIsSendingFeedback(true);

    try {
      await api.post('/feedback', {
        type: feedbackType,
        priority: feedbackPriority,
        message,
        context: help.title,
        page: currentPage,
        path:
          typeof window !== 'undefined'
            ? window.location.pathname
            : currentPage,
      });

      toast.success('Feedback registrado para acompanhamento interno.');
      setFeedbackMessage('');
      setIsFeedbackOpen(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Nao foi possivel registrar o feedback agora.'
      );
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className='fixed bottom-6 right-6 z-50'>
      {isOpen ? (
        <div className='mb-4 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl'>
          <div className='bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.24em] text-blue-200'>
                  Assistente Elo
                </p>
                <h3 className='mt-2 text-xl font-bold'>{help.title}</h3>
                <p className='mt-2 text-sm leading-6 text-slate-200'>
                  {help.whenToUse}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setIsOpen(false)}
                className='rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15'
                aria-label='Fechar assistente'
              >
                x
              </button>
            </div>
          </div>

          <div className='max-h-[68vh] overflow-y-auto p-5'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
                O que fazer aqui
              </p>
              <div className='mt-3 space-y-3'>
                {quickSteps.map((step, index) => (
                  <div
                    key={`${help.page}-assistant-step-${step}`}
                    className='flex gap-3 text-sm leading-6 text-slate-700'
                  >
                    <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
                Duvidas rapidas
              </p>
              <div className='mt-3 space-y-2'>
                {quickFaq.map((item) => {
                  const isQuestionOpen = openQuestion === item.question;

                  return (
                    <button
                      key={`${help.page}-faq-${item.question}`}
                      type='button'
                      onClick={() =>
                        setOpenQuestion(isQuestionOpen ? null : item.question)
                      }
                      className='w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50'
                    >
                      <span className='flex items-center justify-between gap-3 text-sm font-semibold text-slate-900'>
                        {item.question}
                        <span className='text-blue-600'>
                          {isQuestionOpen ? '-' : '+'}
                        </span>
                      </span>
                      {isQuestionOpen ? (
                        <span className='mt-2 block text-sm leading-6 text-slate-600'>
                          {item.answer}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className='mt-5 grid gap-3 sm:grid-cols-2'>
              <button
                type='button'
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('help');
                }}
                className='rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
              >
                Abrir Central
              </button>
              <button
                type='button'
                onClick={() => setIsFeedbackOpen((prev) => !prev)}
                className='rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                Reportar problema
              </button>
            </div>

            {isFeedbackOpen ? (
              <form
                onSubmit={handleSendFeedback}
                className='mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>
                      Feedback do go-live
                    </p>
                    <p className='mt-1 text-sm leading-6 text-slate-600'>
                      Use para reportar problema, duvida ou melhoria percebida
                      durante o uso real.
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsFeedbackOpen(false)}
                    className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100'
                    aria-label='Fechar feedback'
                  >
                    x
                  </button>
                </div>

                <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                  <label className='block'>
                    <span className='text-xs font-bold uppercase tracking-[0.16em] text-slate-400'>
                      Tipo
                    </span>
                    <select
                      value={feedbackType}
                      onChange={(event) => setFeedbackType(event.target.value)}
                      className='mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
                    >
                      <option value='PROBLEMA'>Problema</option>
                      <option value='MELHORIA'>Melhoria</option>
                      <option value='DUVIDA'>Duvida</option>
                      <option value='GO_LIVE'>Go-live</option>
                    </select>
                  </label>

                  <label className='block'>
                    <span className='text-xs font-bold uppercase tracking-[0.16em] text-slate-400'>
                      Prioridade
                    </span>
                    <select
                      value={feedbackPriority}
                      onChange={(event) =>
                        setFeedbackPriority(event.target.value)
                      }
                      className='mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
                    >
                      <option value='BAIXA'>Baixa</option>
                      <option value='MEDIA'>Media</option>
                      <option value='ALTA'>Alta</option>
                      <option value='CRITICA'>Critica</option>
                    </select>
                  </label>
                </div>

                <label className='mt-3 block'>
                  <span className='text-xs font-bold uppercase tracking-[0.16em] text-slate-400'>
                    Observacao
                  </span>
                  <textarea
                    value={feedbackMessage}
                    onChange={(event) =>
                      setFeedbackMessage(event.target.value)
                    }
                    placeholder='Ex.: Na tela de Jornada fiquei em duvida sobre qual arquivo importar...'
                    className='mt-1 min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'
                  />
                </label>

                <button
                  type='submit'
                  disabled={isSendingFeedback}
                  className='mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isSendingFeedback ? 'Registrando...' : 'Registrar feedback'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type='button'
        onClick={() => setIsOpen((prev) => !prev)}
        className='group flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-blue-700'
        aria-label='Abrir assistente Elo'
        title='Abrir assistente Elo'
      >
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-950 transition group-hover:text-blue-700'>
          ?
        </span>
      </button>
    </div>
  );
}

export default FloatingAssistant;
