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
  department: '',
  admissionDate: '',
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
  { key: 'rgFile', label: 'RG' },
  { key: 'cpfFile', label: 'CPF' },
  { key: 'residenceFile', label: 'Comprovante de Residência' },
  { key: 'workCardFile', label: 'Carteira de Trabalho' },
  { key: 'bankDataFile', label: 'Dados Bancários' },
  { key: 'asoFile', label: 'ASO' },
  { key: 'contractFile', label: 'Contrato' },
];

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
    if (token) fetchAdmissionForm();
  }, [token]);

  const progress = useMemo(() => {
    const text = Object.values(formData).filter(
      (v) => String(v || '').trim() !== ''
    ).length;

    const file = Object.values(files).filter(Boolean).length;

    const total =
      Object.keys(initialForm).length + requiredDocumentFields.length;

    return Math.round(((text + file) / total) * 100);
  }, [formData, files]);

  const fetchAdmissionForm = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const res = await api.get(`/admission/public/${token}`);
      const data = res.data?.admissionForm;

      setAdmissionForm(data);

      if (data?.employee) {
        setFormData((prev) => ({
          ...prev,
          name: data.employee.name || '',
          email: data.employee.email || '',
          phone: data.employee.phone || '',
          role: data.employee.role || '',
          department: data.employee.department || '',
        }));
      }
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Não foi possível carregar o formulário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e) => {
    setFiles((prev) => ({
      ...prev,
      [e.target.name]: e.target.files?.[0] || null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return; // 🔥 proteção

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = new FormData();

      Object.entries(formData).forEach(([k, v]) => {
        payload.append(k, v ?? '');
      });

      Object.entries(files).forEach(([k, f]) => {
        if (f) payload.append(k, f);
      });

      const res = await api.post(`/admission/public/${token}`, payload);

      setSuccessMessage(res.data?.message || 'Enviado com sucesso 🚀');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      await fetchAdmissionForm();
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || 'Erro ao enviar formulário.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p>Carregando...</p>
      </div>
    );
  }

  if (errorMessage && !admissionForm) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-red-500'>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-6'>
      <div className='max-w-4xl mx-auto space-y-6'>
        {/* HEADER */}
        <div className='bg-slate-900 text-white p-6 rounded-3xl'>
          <h1 className='text-3xl font-bold'>Pré-admissão</h1>
          <p className='text-sm text-slate-300 mt-2'>
            Complete suas informações
          </p>

          <div className='mt-4'>
            <div className='h-2 bg-white/20 rounded'>
              <div
                className='h-full bg-white rounded'
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className='text-sm mt-1'>{progress}%</p>
          </div>
        </div>

        {successMessage && (
          <div className='bg-green-100 text-green-700 p-3 rounded'>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className='bg-red-100 text-red-700 p-3 rounded'>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* DADOS */}
          <Section title='Dados pessoais'>
            <Grid>
              <Input
                label='Nome'
                name='name'
                value={formData.name}
                onChange={handleChange}
                required
              />
              <Input
                label='CPF'
                name='cpf'
                value={formData.cpf}
                onChange={handleChange}
                required
              />
              <Input
                type='date'
                label='Nascimento'
                name='birthDate'
                value={formData.birthDate}
                onChange={handleChange}
                required
              />
              <Input
                label='Estado civil'
                name='maritalStatus'
                value={formData.maritalStatus}
                onChange={handleChange}
                required
              />
              <Input
                label='Email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Input
                label='Telefone'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </Grid>
          </Section>

          {/* DOCUMENTOS */}
          <Section title='Documentos'>
            <Grid>
              {requiredDocumentFields.map((doc) => (
                <div key={doc.key}>
                  <label>{doc.label}</label>
                  <input
                    type='file'
                    name={doc.key}
                    onChange={handleFileChange}
                  />
                  <p className='text-xs'>
                    {files[doc.key]?.name || 'Nenhum arquivo'}
                  </p>
                </div>
              ))}
            </Grid>
          </Section>

          <button
            type='submit'
            disabled={submitting}
            className='bg-slate-900 text-white px-6 py-3 rounded'
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* COMPONENTES AUXILIARES */
const Section = ({ title, children }) => (
  <div className='bg-white p-6 rounded-3xl shadow'>
    <h2 className='text-xl font-bold mb-4'>{title}</h2>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div className='grid md:grid-cols-2 gap-4'>{children}</div>
);

const Input = ({ label, ...props }) => (
  <div>
    <label className='block text-sm mb-1'>{label}</label>
    <input {...props} className='w-full border p-2 rounded' />
  </div>
);

export default AdmissionForm;
