import { useState } from 'react';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!email.trim()) {
      toast.error('Informe seu e-mail.');
      return;
    }

    try {
      setLoading(true);
      setSuccessMessage('');

      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      const message =
        response.data?.message ||
        'Se existir uma conta com este e-mail, você receberá um link para redefinir sua senha.';

      setSuccessMessage(message);
      toast.success('Solicitação enviada com sucesso.');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Não foi possível solicitar a redefinição de senha.';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-100'>
      <div className='flex min-h-screen items-center justify-center px-6 py-10 sm:px-8 lg:px-12'>
        <div className='w-full max-w-xl'>
          <div className='rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10'>
            <div className='mb-8'>
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700'>
                <ShieldAlert className='h-4 w-4' />
                Recuperação de acesso
              </div>

              <h1 className='text-3xl font-bold text-slate-900'>
                Esqueceu sua senha?
              </h1>
              <p className='mt-3 text-slate-500'>
                Informe seu e-mail de acesso para receber um link de redefinição
                de senha.
              </p>
            </div>

            {successMessage ? (
              <div className='mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700'>
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  E-mail de acesso
                </label>
                <div className='relative'>
                  <Mail className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400' />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value.trimStart().toLowerCase())
                    }
                    placeholder='Digite seu e-mail'
                    autoComplete='email'
                    className='w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                    required
                  />
                </div>
              </div>

              <div className='rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900'>
                Se o e-mail estiver cadastrado no sistema, enviaremos um link
                válido por 30 minutos para redefinir sua senha.
              </div>

              <div className='flex flex-col gap-3 sm:flex-row sm:justify-between'>
                <Link
                  to='/login'
                  className='inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  <ArrowLeft className='h-4 w-4' />
                  Voltar para login
                </Link>

                <button
                  type='submit'
                  disabled={loading}
                  className='inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
