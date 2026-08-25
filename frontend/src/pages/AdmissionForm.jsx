import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const initialForm = {
  name: '',
  cpf: '',
  birthDate: '',
  maritalStatus: '',
  email: '',
  phone: '',
  role: '',
  shirtSize: '',
  pantsSize: '',
  bootSize: '',
  address: '',
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  pixKey: '',
  notes: '',
};

const requiredDocumentFields = [
  { key: 'photoFile', label: 'Foto digital para crachá' },
  { key: 'rgFrontFile', label: 'RG (frente)' },
  { key: 'rgBackFile', label: 'RG (verso)' },
  { key: 'cpfFile', label: 'CPF' },
  { key: 'birthCertificateFile', label: 'Certidão de nascimento' },
  { key: 'marriageCertificateFile', label: 'Certidão de casamento' },
  { key: 'voterTitleFile', label: 'Título de eleitor' },
  { key: 'residenceFile', label: 'Comprovante de residência' },
  { key: 'schoolHistoryFile', label: 'Histórico escolar' },
  { key: 'enrollmentProofFile', label: 'Comprovante de matrícula' },
  { key: 'militaryFile', label: 'Reservista / Dispensa' },
  { key: 'cnhFile', label: 'CNH (se houver)' },
  { key: 'bankDataFile', label: 'Dados bancários' },
  { key: 'asoFile', label: 'ASO' },
  { key: 'contractFile', label: 'Contrato' },
];

const statusConfig = {
  PENDENTE: {
    label: 'Pendente',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
  },
  ENVIADO: {
    label: 'Enviado',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
  },
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando aprovação do RH',
    badge: 'border border-violet-200 bg-violet-50 text-violet-700',
  },
  RESPONDIDO: {
    label: 'Respondido',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  APROVADO: {
    label: 'Aprovado',
    badge: 'border border-green-200 bg-green-50 text-green-700',
  },
  CONCLUIDO: {
    label: 'Concluído',
    badge: 'border border-slate-200 bg-slate-100 text-slate-700',
  },
};

const Input = ({ label, className = '', ...props }) => (
  <div>
    <label className='mb-2 block text-sm font-semibold text-slate-700'>
      {label}
    </label>
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:opacity-60 ${className}`}
    />
  </div>
);

const Section = ({ title, description, children }) => (
  <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
    <div className='mb-6'>
      <h2 className='text-2xl font-bold text-slate-900'>{title}</h2>
      {description ? (
        <p className='mt-1 text-sm text-slate-500'>{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const Grid = ({ children }) => (
  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>{children}</div>
);

const StatusBadge = ({ status }) => {
  const current = statusConfig[status] || statusConfig.PENDENTE;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${current.badge}`}
    >
      {current.label}
    </span>
  );
};

const AdmissionForm = () => {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admissionForm, setAdmissionForm] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (token) {
      fetchAdmissionForm();
    }
  }, [token]);

  const currentStatus = admissionForm?.status || 'PENDENTE';

  const isLocked = useMemo(() => {
    return [
      'AGUARDANDO_APROVACAO',
      'RESPONDIDO',
      'APROVADO',
      'CONCLUIDO',
    ].includes(currentStatus);
  }, [currentStatus]);

  const progress = useMemo(() => {
    const textCount = Object.values(formData).filter(
      (value) => String(value || '').trim() !== ''
    ).length;

    const fileCount = Object.values(files).filter(Boolean).length;

    const totalFields =
      Object.keys(initialForm).length + requiredDocumentFields.length;

    return Math.round(((textCount + fileCount) / totalFields) * 100);
  }, [formData, files]);

  const fetchAdmissionForm = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await api.get(`/admission/public/${token}`);
      const data = res.data?.admissionForm || null;

      setAdmissionForm(data);

      if (data?.candidate) {
        setFormData((prev) => ({
          ...prev,
          name: data.candidate.fullName || '',
          email: data.candidate.email || '',
          phone: data.candidate.phone || '',
          role: data.candidate.desiredPosition || '',
        }));
      }

      if (
        [
          'AGUARDANDO_APROVACAO',
          'RESPONDIDO',
          'APROVADO',
          'CONCLUIDO',
        ].includes(data?.status)
      ) {
        setSuccessMessage(
          data?.status === 'APROVADO'
            ? 'Sua pré-admissão já foi aprovada pelo RH.'
            : 'Seu formulário já foi enviado e está aguardando aprovação do RH.'
        );
      }
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      setErrorMessage(
        error?.response?.data?.message ||
          'Não foi possível carregar o formulário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;

    setFiles((prev) => ({
      ...prev,
      [name]: selectedFiles?.[0] || null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting || isLocked) return;

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value ?? '');
      });

      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          payload.append(key, file);
        }
      });

      const res = await api.post(`/admission/public/${token}`, payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(
        res.data?.message ||
          'Formulário enviado com sucesso. Agora ele ficará aguardando aprovação do RH.'
      );

      window.scrollTo({ top: 0, behavior: 'smooth' });

      await fetchAdmissionForm();
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setErrorMessage(
        error?.response?.data?.message || 'Erro ao enviar formulário.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 py-10'>
        <div className='mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
          <p className='text-slate-500'>Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !admissionForm) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 py-10'>
        <div className='mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-red-200 bg-white shadow-xl'>
          <div className='bg-gradient-to-r from-slate-950 via-slate-900 to-red-900 px-8 py-8 text-white'>
            <p className='text-sm font-medium uppercase tracking-[0.25em] text-red-200'>
              Pré-admissão
            </p>
            <h1 className='mt-3 text-4xl font-bold'>Link indisponível</h1>
            <p className='mt-4 text-lg text-slate-300'>
              Este formulário não pode ser acessado no momento.
            </p>
          </div>

          <div className='p-8'>
            <div className='rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700'>
              {errorMessage}
            </div>

            <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
              <p className='text-sm text-slate-600'>
                Se você recebeu este link pelo RH, peça um novo link de
                pré-admissão para continuar seu processo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4 py-8'>
      <div className='mx-auto max-w-5xl space-y-6'>
        <div className='overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-8 text-white shadow-xl'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-sm font-medium uppercase tracking-[0.25em] text-blue-200'>
                Portal do colaborador
              </p>
              <h1 className='mt-3 text-4xl font-bold sm:text-5xl'>
                Formulário de pré-admissão
              </h1>
              <p className='mt-4 text-lg text-slate-300'>
                Preencha seus dados, envie os documentos solicitados e aguarde a
                validação final do RH.
              </p>
            </div>

            <div className='flex flex-col gap-3'>
              <div className='rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md'>
                <p className='text-xs uppercase tracking-[0.2em] text-blue-200'>
                  Progresso
                </p>
                <p className='mt-2 text-3xl font-bold'>{progress}%</p>
              </div>

              <div className='flex justify-end'>
                <StatusBadge status={currentStatus} />
              </div>
            </div>
          </div>

          <div className='mt-6'>
            <div className='mb-2 flex items-center justify-between text-xs text-slate-300'>
              <span>Preenchimento</span>
              <span>{progress}%</span>
            </div>
            <div className='h-2 overflow-hidden rounded-full bg-white/10'>
              <div
                className='h-full rounded-full bg-white transition-all'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {successMessage ? (
          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm'>
            {successMessage}
          </div>
        ) : null}

        {errorMessage && admissionForm ? (
          <div className='rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 shadow-sm'>
            {errorMessage}
          </div>
        ) : null}

        {isLocked ? (
          <div className='rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-violet-700 shadow-sm'>
            Este formulário já foi enviado e está aguardando aprovação do RH.
            Caso precise corrigir alguma informação, entre em contato com o RH.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className='space-y-6'>
          <Section
            title='Dados pessoais'
            description='Informe seus dados principais para o processo de pré-admissão.'
          >
            <Grid>
              <Input
                label='Nome completo'
                name='name'
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
              <Input
                label='CPF'
                name='cpf'
                value={formData.cpf}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
              <Input
                type='date'
                label='Data de nascimento'
                name='birthDate'
                value={formData.birthDate}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
              <Input
                label='Estado civil'
                name='maritalStatus'
                value={formData.maritalStatus}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
              <Input
                type='email'
                label='E-mail'
                name='email'
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
              <Input
                label='Telefone'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
            </Grid>
          </Section>

          <Section
            title='Dados profissionais'
            description='Confira o cargo informado pelo RH e preencha apenas seu endereço nesta etapa.'
          >
            <Grid>
              <Input
                label='Cargo'
                name='role'
                value={formData.role}
                onChange={handleChange}
                readOnly
                disabled
                className='bg-slate-100 text-slate-600'
              />
              <Input
                label='Endereço'
                name='address'
                value={formData.address}
                onChange={handleChange}
                disabled={isLocked}
              />
            </Grid>

            <div className='mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800'>
              Cargo, departamento e data de início são confirmados internamente
              pelo RH antes da aprovação final.
            </div>
          </Section>

          <Section
            title='Fardamento e dados bancários'
            description='Essas informações ajudam o RH a preparar sua entrada.'
          >
            <Grid>
              <Input
                label='Tamanho da camisa'
                name='shirtSize'
                value={formData.shirtSize}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Tamanho da calça'
                name='pantsSize'
                value={formData.pantsSize}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Tamanho da bota'
                name='bootSize'
                value={formData.bootSize}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Banco'
                name='bankName'
                value={formData.bankName}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Agência'
                name='bankAgency'
                value={formData.bankAgency}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Conta'
                name='bankAccount'
                value={formData.bankAccount}
                onChange={handleChange}
                disabled={isLocked}
              />
              <Input
                label='Chave PIX'
                name='pixKey'
                value={formData.pixKey}
                onChange={handleChange}
                disabled={isLocked}
              />
            </Grid>
          </Section>

          <Section
            title='Documentos obrigatórios'
            description='Anexe os arquivos solicitados para que o RH possa validar sua pré-admissão.'
          >
            <Grid>
              {requiredDocumentFields.map((doc) => (
                <div
                  key={doc.key}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                >
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    {doc.label}
                  </label>
                  <input
                    type='file'
                    name={doc.key}
                    onChange={handleFileChange}
                    disabled={isLocked}
                    className='block w-full text-sm text-slate-600 disabled:opacity-60'
                  />
                  <p className='mt-2 text-xs text-slate-500'>
                    {files[doc.key]?.name || 'Nenhum arquivo selecionado'}
                  </p>
                </div>
              ))}
            </Grid>
          </Section>

          <Section
            title='Observações'
            description='Se precisar, adicione alguma informação complementar.'
          >
            <textarea
              name='notes'
              value={formData.notes}
              onChange={handleChange}
              rows='5'
              disabled={isLocked}
              placeholder='Escreva aqui qualquer observação relevante para o RH.'
              className='w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:opacity-60'
            />
          </Section>

          {!isLocked ? (
            <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
              <button
                type='submit'
                disabled={submitting}
                className='rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {submitting ? 'Enviando...' : 'Enviar formulário'}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default AdmissionForm;
