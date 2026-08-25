import { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!token) {
      toast.error('Link de redefinição inválido.');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      setSuccessMessage('');

      const response = await api.post('/auth/reset-password', {
        token,
        password,
      });

      const message =
        response.data?.message || 'Senha redefinida com sucesso.';

      setSuccessMessage(message);
      setPassword('');
      setConfirmPassword('');
      toast.success('Senha atualizada com sucesso.');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Não foi possível redefinir sua senha.';

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
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700'>
                <KeyRound className='h-4 w-4' />
                Nova senha
              </div>

              <h1 className='text-3xl font-bold text-slate-900'>
                Redefinir senha
              </h1>
              <p className='mt-3 text-slate-500'>
                Digite sua nova senha para recuperar o acesso ao EloSystem.
              </p>
            </div>

            {successMessage ? (
              <div className='mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700'>
                {successMessage}
              </div>
            ) : null}

            {!token ? (
              <div className='mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700'>
                O link de redefinição é inválido ou está incompleto.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Nova senha
                </label>
                <div className='relative'>
                  <LockKeyhole className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400' />
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Digite sua nova senha'
                    autoComplete='new-password'
                    className='w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Confirmar nova senha
                </label>
                <div className='relative'>
                  <LockKeyhole className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400' />
                  <input
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder='Confirme sua nova senha'
                    autoComplete='new-password'
                    className='w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100'
                    required
                  />
                </div>
              </div>

              <div className='rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900'>
                Por segurança, o link de redefinição expira em 30 minutos.
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
                  disabled={loading || !token}
                  className='inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loading ? 'Redefinindo...' : 'Salvar nova senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
