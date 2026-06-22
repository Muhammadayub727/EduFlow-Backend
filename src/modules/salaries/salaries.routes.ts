import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { computeTeacherSalary } from '../../utils/businessRules';

export const calculateSalariesSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Oy YYYY-MM formatida bo\'lishi kerak'),
});

export const advancePaymentSchema = z.object({
  teacherId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().min(0),
});

export const markPaidSchema = z.object({
  teacherId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

function enrich(salary: ReturnType<typeof db.salaries.findById>) {
  if (!salary) return null;
  const teacher = db.users.findById(salary.teacherId);
  return {
    ...salary,
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { month, teacherId } = req.query as Record<string, string | undefined>;
    let salaries = db.salaries.findAll();

    if (req.user!.activeRole === 'teacher') {
      salaries = salaries.filter((s) => s.teacherId === req.user!.userId);
    }
    if (month) salaries = salaries.filter((s) => s.month === month);
    if (teacherId) salaries = salaries.filter((s) => s.teacherId === teacherId);

    res.json({ success: true, data: salaries.map(enrich) });
  })
);

router.post(
  '/calculate',
  requireRole('super_admin', 'admin'),
  validateBody(calculateSalariesSchema),
  asyncHandler(async (req, res: Response) => {
    const { month } = req.body;
    const teacherProfiles = db.teacherProfiles.findMany((t) => t.employmentStatus !== 'terminated');

    const results = teacherProfiles.map((profile) => {
      const { totalCollected, percent, salaryAmount } = computeTeacherSalary(profile.id, month);
      const existing = db.salaries.findOne((s) => s.teacherId === profile.id && s.month === month);

      if (existing) {
        return db.salaries.update(existing.id, {
          totalCollectedFromStudents: totalCollected,
          percent,
          salaryAmount,
          remaining: salaryAmount - existing.advancePaid,
        });
      }
      return db.salaries.create({
        id: newId(),
        teacherId: profile.id,
        month,
        totalCollectedFromStudents: totalCollected,
        percent,
        salaryAmount,
        advancePaid: 0,
        remaining: salaryAmount,
        status: 'pending',
        createdAt: nowIso(),
      });
    });

    res.json({ success: true, data: results.map(enrich) });
  })
);

router.post(
  '/advance',
  requireRole('super_admin', 'admin'),
  validateBody(advancePaymentSchema),
  asyncHandler(async (req, res: Response) => {
    const { teacherId, month, amount } = req.body;
    const existing = db.salaries.findOne((s) => s.teacherId === teacherId && s.month === month);
    if (!existing) throw ApiError.notFound('Maosh yozuvi topilmadi. Avval /calculate ishga tushiring');

    const newAdvance = existing.advancePaid + amount;
    const updated = db.salaries.update(existing.id, {
      advancePaid: newAdvance,
      remaining: existing.salaryAmount - newAdvance,
    });
    res.json({ success: true, data: enrich(updated) });
  })
);

router.post(
  '/mark-paid',
  requireRole('super_admin', 'admin'),
  validateBody(markPaidSchema),
  asyncHandler(async (req, res: Response) => {
    const { teacherId, month } = req.body;
    const existing = db.salaries.findOne((s) => s.teacherId === teacherId && s.month === month);
    if (!existing) throw ApiError.notFound('Maosh yozuvi topilmadi');

    const updated = db.salaries.update(existing.id, {
      status: 'paid',
      advancePaid: existing.salaryAmount,
      remaining: 0,
    });
    res.json({ success: true, data: enrich(updated) });
  })
);

export default router;
