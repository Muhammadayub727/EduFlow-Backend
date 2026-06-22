import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(2, 'Ism kamida 2 belgidan iborat bo\'lishi kerak'),
  lastName: z.string().min(2, 'Familiya kamida 2 belgidan iborat bo\'lishi kerak'),
  phone: z.string().min(7, 'Telefon raqami noto\'g\'ri'),
  age: z.number().int().min(3).max(100).optional(),
  address: z.string().optional(),
  email: z.string().email('Email manzil noto\'g\'ri').optional(),
  courseId: z.string().min(1, 'Kurs tanlanishi shart'),
  groupId: z.string().min(1, 'Guruh tanlanishi shart'),
  familyId: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
