import { z } from 'zod';

const optionalTrimmedString = () =>
  z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional();

const optionalTimeString = () =>
  z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horario invalido')
    .nullable()
    .optional();

const optionalDateValue = () =>
  z
    .union([z.string(), z.date()])
    .transform((value) => {
      if (!value) return null;
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .nullable()
    .optional();

const workScheduleAssignmentInputSchema = z.object({
  employeeId: z.coerce.number().int().positive('Colaborador obrigatorio'),
  workDate: z.union([z.string(), z.date()]),
  startTime: optionalTimeString(),
  endTime: optionalTimeString(),
  breakMinutes: z.coerce.number().int().min(0).max(720).nullable().optional(),
  roleNote: optionalTrimmedString(),
  status: z
    .string()
    .trim()
    .min(1, 'Status individual obrigatorio')
    .max(60)
    .optional(),
});

export const workScheduleSchema = z
  .object({
    name: z.string().trim().min(3, 'Nome da escala e obrigatorio').max(120),
    scheduleType: z
      .string()
      .trim()
      .min(1, 'Tipo de escala e obrigatorio')
      .max(60),
    status: z.string().trim().min(1).max(60).optional(),
    startDate: z.union([z.string(), z.date()]),
    endDate: z.union([z.string(), z.date()]),
    defaultStartTime: optionalTimeString(),
    defaultEndTime: optionalTimeString(),
    breakMinutes: z.coerce.number().int().min(0).max(720).nullable().optional(),
    location: optionalTrimmedString(),
    clientName: optionalTrimmedString(),
    notes: optionalTrimmedString(),
    observations: optionalTrimmedString(),
    specialDateId: z.coerce.number().int().positive().nullable().optional(),
    assignments: z.array(workScheduleAssignmentInputSchema).default([]),
  })
  .superRefine((value, context) => {
    const startDate = new Date(value.startDate);
    const endDate = new Date(value.endDate);

    if (Number.isNaN(startDate.getTime())) {
      context.addIssue({
        path: ['startDate'],
        code: z.ZodIssueCode.custom,
        message: 'Data inicial invalida',
      });
    }

    if (Number.isNaN(endDate.getTime())) {
      context.addIssue({
        path: ['endDate'],
        code: z.ZodIssueCode.custom,
        message: 'Data final invalida',
      });
    }

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate < startDate
    ) {
      context.addIssue({
        path: ['endDate'],
        code: z.ZodIssueCode.custom,
        message: 'A data final deve ser maior ou igual a data inicial',
      });
    }
  });

export const workScheduleAssignmentSchema = workScheduleAssignmentInputSchema;

export const workScheduleStatusSchema = z.object({
  status: z
    .string()
    .trim()
    .min(1, 'Status obrigatorio')
    .max(60, 'Status invalido'),
});

export const workScheduleQuerySchema = z.object({
  month: z.string().optional(),
  year: z.string().optional(),
  startDate: optionalDateValue(),
  endDate: optionalDateValue(),
  type: z.string().trim().optional(),
  status: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  clientName: z.string().trim().optional(),
  specialDateId: z.string().trim().optional(),
  search: z.string().trim().optional(),
});
