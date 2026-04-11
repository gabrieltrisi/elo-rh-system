import { z } from 'zod';

export const employeeSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome completo é obrigatório')
    .max(150, 'Nome muito longo'),

  cpf: z.string().min(11, 'CPF inválido').max(14, 'CPF inválido'),

  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),

  maritalStatus: z.string().min(1, 'Estado civil é obrigatório'),

  email: z.string().email('Email inválido'),

  phone: z.string().min(8, 'Telefone inválido'),

  role: z.string().min(2, 'Cargo é obrigatório').max(100, 'Cargo muito longo'),

  department: z
    .string()
    .min(2, 'Departamento é obrigatório')
    .max(100, 'Departamento muito longo'),

  admissionDate: z.string().min(1, 'Data de admissão é obrigatória'),

  status: z.string().optional().default('ativo'),

  shirtSize: z.string().optional(),
  pantsSize: z.string().optional(),
  bootSize: z.string().optional(),

  notes: z.string().optional(),
});
