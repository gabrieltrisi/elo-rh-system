import { z } from 'zod';

const employeeCompanyLinkSchema = z.object({
  companyId: z.coerce.number().int().positive('Empresa inválida'),
  registrationNumber: z.string().optional().nullable(),
  role: z.string().min(2, 'Cargo do vínculo é obrigatório').max(100),
  department: z
    .string()
    .min(2, 'Departamento do vínculo é obrigatório')
    .max(100),
  admissionDate: z.string().min(1, 'Data de admissão do vínculo é obrigatória'),
  status: z.string().optional().default('ativo'),
  contractType: z.string().optional().nullable(),
  salaryBase: z.union([z.number(), z.string(), z.null()]).optional(),
  notes: z.string().optional().nullable(),
});

export const employeeSchema = z.object({
  name: z.string().min(3, 'Nome completo é obrigatório').max(150, 'Nome muito longo'),
  cpf: z.string().min(11, 'CPF inválido').max(14, 'CPF inválido'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  maritalStatus: z.string().min(1, 'Estado civil é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Telefone inválido'),
  role: z.string().min(2).max(100).optional(),
  department: z.string().min(2).max(100).optional(),
  admissionDate: z.string().min(1).optional(),
  status: z.string().optional().default('ativo'),
  contractType: z.string().optional().nullable(),
  shirtSize: z.string().optional(),
  pantsSize: z.string().optional(),
  bootSize: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.coerce.number().int().positive().optional(),
  companyLinks: z
    .array(employeeCompanyLinkSchema)
    .min(1, 'Informe pelo menos uma empresa')
    .optional(),
});
