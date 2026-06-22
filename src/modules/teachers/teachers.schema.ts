import { z } from 'zod';

export const createTeacherSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email('Email manzil noto\'g\'ri'),
  phone: z.string().min(7),
  salaryPercent: z.number().min(0).max(100),
  hireDate: z.string().min(8),
});

export const updateTeacherSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  salaryPercent: z.number().min(0).max(100).optional(),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated']).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
