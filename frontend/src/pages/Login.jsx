import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import logoElo from '../assets/logo-elo.jpeg.png';

function Login({ onLogin }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await api.post('/auth/login', form);

      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token ||
        response.data?.user?.token;

      if (!token) {
        throw new Error('Token não encontrado na resposta do login');
      }

      localStorage.setItem('token', token);

      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      toast.success('Login realizado com sucesso!');
      onLogin();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast('Em breve: recuperação de senha.', {
      icon: '🔐',
    });
  };

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
                  Gestão de RH moderna
                </p>

                <h2 className='mt-4 text-5xl font-bold leading-tight'>
                  Centralize pessoas, processos e documentos em um só lugar.
                </h2>

                <p className='mt-6 text-lg leading-8 text-slate-300'>
                  Controle colaboradores, férias, benefícios, advertências,
                  afastamentos, documentos e onboarding com uma experiência
                  profissional, organizada e segura.
                </p>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <ShieldCheck className='mb-3 h-6 w-6 text-emerald-300' />
                <h3 className='font-semibold'>Mais segurança</h3>
                <p className='mt-2 text-sm text-slate-300'>
                  Acesso centralizado para operações internas.
                </p>
              </div>

              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <Users className='mb-3 h-6 w-6 text-blue-300' />
                <h3 className='font-semibold'>Gestão de pessoas</h3>
                <p className='mt-2 text-sm text-slate-300'>
                  Informações organizadas por colaborador e histórico.
                </p>
              </div>

              <div className='rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
                <Building2 className='mb-3 h-6 w-6 text-violet-300' />
                <h3 className='font-semibold'>Escalável</h3>
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
                  Acesso seguro
                </p>
                <h2 className='mt-3 text-3xl font-bold text-slate-900'>
                  Entrar no sistema
                </h2>
                <p className='mt-2 text-slate-500'>
                  Informe seu e-mail e senha para acessar o painel do RH.
                </p>
              </div>

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
                    placeholder='Digite seu e-mail'
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
                      placeholder='Digite sua senha'
                      className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                      required
                    />

                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
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
                  {loading ? 'Entrando...' : 'Entrar no sistema'}
                </button>
              </form>

              <div className='mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm text-slate-500'>
                  Ambiente interno para gestão de colaboradores, documentos,
                  férias, benefícios e ocorrências.
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
