import { z } from 'zod';

export const signUpSchema = z.object({
  firstName: z.string().min(2, 'Ism kamida 2 belgidan iborat bo\'lishi kerak'),
  lastName: z.string().min(2, 'Familiya kamida 2 belgidan iborat bo\'lishi kerak'),
  email: z.string().email('Email manzil noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak'),
  phone: z.string().optional(),
  // Self-registration is only allowed as student or teacher (never admin/super_admin)
  role: z.enum(['student', 'teacher']),
});

export const signInSchema = z.object({
  email: z.string().email('Email manzil noto\'g\'ri'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email manzil noto\'g\'ri'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token noto\'g\'ri'),
  newPassword: z.string().min(6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak'),
});

export const switchRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'teacher', 'student']),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
