import { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Building2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { resolveApiErrorMessage } from '../services/api';
import { consumeAuthNotice } from '../utils/authSession';
import logoElo from '../assets/logo-elo.jpeg.png';

const initialMfaState = {
  active: false,
  challengeToken: '',
  maskedEmail: '',
  expiresAt: '',
  purpose: 'LOGIN_MFA',
  code: '',
};

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [mfaStep, setMfaStep] = useState(initialMfaState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    const notice = consumeAuthNotice();

    if (notice) {
      setErrorBanner(notice);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (errorBanner) {
      setErrorBanner('');
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === 'email' ? value.trimStart().toLowerCase() : value,
    }));
  };

  const finalizeLogin = (response) => {
    const token =
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.data?.token ||
      response.data?.user?.token;

    const user = response.data?.user || response.data?.data?.user || null;
    const session =
      response.data?.session || response.data?.data?.session || null;

    if (!token) {
      throw new Error('Token nao encontrado na resposta da autenticacao');
    }

    onLogin({ token, user, session });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const payload = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    if (!payload.email || !payload.password) {
      toast.error('Informe e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorBanner('');
      resetMfaStep();

      const response = await api.post('/auth/login', payload);

      if (
        response.data?.state === 'MFA_REQUIRED' ||
        response.data?.state === 'MFA_SETUP_REQUIRED'
      ) {
        setMfaStep({
          active: true,
          challengeToken: response.data?.challengeToken || '',
          maskedEmail: response.data?.maskedEmail || payload.email,
          expiresAt: response.data?.expiresAt || '',
          purpose: response.data?.purpose || 'LOGIN_MFA',
          code: '',
        });

        toast.success(
          response.data?.state === 'MFA_SETUP_REQUIRED'
            ? 'Codigo enviado para ativar sua verificacao em duas etapas.'
            : 'Codigo de verificacao enviado para o seu e-mail.'
        );
        return;
      }

      finalizeLogin(response);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      const message = resolveApiErrorMessage(error);
      setErrorBanner(
        !error.response
          ? 'Servidor indisponivel ou conexao instavel. Confira o backend e tente novamente.'
          : message
      );
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!mfaStep.challengeToken || !mfaStep.code.trim()) {
      toast.error('Informe o codigo de verificacao.');
      return;
    }

    try {
      setLoading(true);
      setErrorBanner('');

      const response = await api.post('/auth/mfa/verify', {
        challengeToken: mfaStep.challengeToken,
        code: mfaStep.code.trim(),
      });

      finalizeLogin(response);
      toast.success('Verificacao concluida com sucesso!');
    } catch (error) {
      const message = resolveApiErrorMessage(error);
      setErrorBanner(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const resetMfaStep = () => setMfaStep(initialMfaState);

  return (
    <div className='min-h-screen bg-slate-100'>
      <div className='grid min-h-screen lg:grid-cols-2'>
        <div className='relative hidden overflow-hidden bg-gradient-to-br from-[#06112a] via-[#081734] to-[#0b1736] lg:flex'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_30%)]' />

          <div className='relative z-10 flex w-full flex-col justify-between p-12 text-white'>
            <div>
              <div className='inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm'>
                <img
                  src={logoElo}
                  alt='ELO System'
                  className='h-12 w-12 rounded-xl object-contain'
                />
                <div>
                  <p className='text-xs uppercase tracking-[0.25em] text-slate-300'>
                    Plataforma interna
                  </p>
                  <h1 className='text-2xl font-bold'>ELO System</h1>
                </div>
              </div>

              <div className='mt-12 max-w-xl'>
                <p className='text-sm font-medium uppercase tracking-[0.25em] text-blue-300'>
                  Gestao de RH moderna
                </p>

                <h2 className='mt-4 text-5xl font-bold leading-tight'>
                  Centralize pessoas, processos e documentos em um so lugar.
                </h2>

                <p className='mt-6 text-lg leading-8 text-slate-300'>
                  Controle colaboradores, ferias, beneficios, advertencias,
                  afastamentos, documentos e onboarding com uma experiencia
                  profissional, organizada e segura.
                </p>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <ShieldCheck className='mb-3 h-6 w-6 text-emerald-300' />
                <h3 className='font-semibold'>Mais seguranca</h3>
                <p className='mt-2 text-sm text-slate-300'>
                  Acesso centralizado para operacoes internas sensiveis.
                </p>
              </div>

              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <Users className='mb-3 h-6 w-6 text-blue-300' />
                <h3 className='font-semibold'>Gestao de pessoas</h3>
                <p className='mt-2 text-sm text-slate-300'>
                  Informacoes organizadas por colaborador e historico.
                </p>
              </div>

              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <Building2 className='mb-3 h-6 w-6 text-violet-300' />
                <h3 className='font-semibold'>Escalavel</h3>
                <p className='mt-2 text-sm text-slate-300'>
                  Estrutura pronta para crescer com a empresa.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='relative z-20 flex items-center justify-center px-6 py-10 sm:px-8 lg:px-12'>
          <div className='w-full max-w-md'>
            <div className='mb-8 flex items-center justify-center lg:hidden'>
              <div className='inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                <img
                  src={logoElo}
                  alt='ELO System'
                  className='h-12 w-12 rounded-xl object-contain'
                />
                <div>
                  <p className='text-xs uppercase tracking-[0.25em] text-slate-500'>
                    Plataforma interna
                  </p>
                  <h1 className='text-xl font-bold text-slate-900'>
                    ELO System
                  </h1>
                </div>
              </div>
            </div>

            <div className='rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10'>
              <div className='mb-8'>
                <p className='text-sm font-medium uppercase tracking-[0.25em] text-slate-400'>
                  {mfaStep.active ? 'Verificacao adicional' : 'Acesso seguro'}
                </p>
                <h2 className='mt-3 text-3xl font-bold text-slate-900'>
                  {mfaStep.active ? 'Confirmar codigo' : 'Entrar no sistema'}
                </h2>
                <p className='mt-2 text-slate-500'>
                  {mfaStep.active
                    ? `Conclua a validacao enviada para ${mfaStep.maskedEmail || 'seu e-mail corporativo'}.`
                    : 'Informe seu e-mail e senha para acessar o painel do RH.'}
                </p>
              </div>

              {errorBanner ? (
                <div className='mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800'>
                  <p className='font-semibold'>Nao foi possivel concluir o acesso</p>
                  <p className='mt-1'>{errorBanner}</p>
                </div>
              ) : null}

              {mfaStep.active ? (
                <form onSubmit={handleVerifyMfa} className='space-y-5'>
                  <div className='rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900'>
                    <p className='font-semibold'>
                      {mfaStep.purpose === 'MFA_SETUP'
                        ? 'Ativacao inicial da verificacao em duas etapas'
                        : 'Validacao de login protegida'}
                    </p>
                    <p className='mt-2 text-blue-700'>
                      Digite o codigo de 6 digitos enviado para{' '}
                      <strong>{mfaStep.maskedEmail}</strong>.
                    </p>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      Codigo de verificacao
                    </label>
                    <input
                      type='text'
                      inputMode='numeric'
                      maxLength={6}
                      disabled={loading}
                      value={mfaStep.code}
                      onChange={(event) =>
                        setMfaStep((prev) => ({
                          ...prev,
                          code: event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 6),
                        }))
                      }
                      placeholder='000000'
                      className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-center text-lg font-semibold tracking-[0.35em] text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                      required
                    />
                    {mfaStep.expiresAt ? (
                      <p className='mt-2 text-xs text-slate-500'>
                        Expira em{' '}
                        {new Date(mfaStep.expiresAt).toLocaleString('pt-BR')}
                      </p>
                    ) : null}
                  </div>

                  <div className='flex gap-3'>
                    <button
                      type='button'
                      onClick={resetMfaStep}
                      className='w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                    >
                      Voltar
                    </button>
                    <button
                      type='submit'
                      disabled={loading}
                      className='w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {loading ? 'Validando...' : 'Confirmar codigo'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className='space-y-5'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-slate-700'>
                      E-mail
                    </label>
                    <input
                      type='email'
                      name='email'
                      value={form.email}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder='Digite seu e-mail'
                      autoComplete='email'
                      className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                      required
                    />
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='block text-sm font-semibold text-slate-700'>
                        Senha
                      </label>

                      <button
                        type='button'
                        onClick={handleForgotPassword}
                        className='text-sm font-medium text-blue-600 transition hover:text-blue-700'
                      >
                        Esqueceu a senha?
                      </button>
                    </div>

                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name='password'
                        value={form.password}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder='Digite sua senha'
                        autoComplete='current-password'
                        className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                        required
                      />

                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600'
                      >
                        {showPassword ? (
                          <EyeOff className='h-5 w-5' />
                        ) : (
                          <Eye className='h-5 w-5' />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={loading}
                    className='w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {loading ? 'Validando acesso...' : 'Entrar no sistema'}
                  </button>
                </form>
              )}

              <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm text-slate-500'>
                  {mfaStep.active
                    ? 'Esta camada adicional protege sessoes, dados sensiveis e operacoes administrativas criticas.'
                    : 'Ambiente interno para gestao de colaboradores, documentos, ferias, beneficios e ocorrencias.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
