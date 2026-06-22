import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { computeAmountDue } from '../../utils/businessRules';

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Oy YYYY-MM formatida bo\'lishi kerak'),
  amountPaid: z.number().min(0),
});

export const recalculateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

function enrich(payment: ReturnType<typeof db.payments.findById>) {
  if (!payment) return null;
  const student = db.users.findById(payment.studentId);
  const group = db.groups.findById(payment.groupId);
  return {
    ...payment,
    studentName: student ? `${student.firstName} ${student.lastName}` : null,
    groupName: group ? group.name : null,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { month, studentId, status } = req.query as Record<string, string | undefined>;
    let payments = db.payments.findAll();

    if (req.user!.activeRole === 'student') {
      payments = payments.filter((p) => p.studentId === req.user!.userId);
    }
    if (month) payments = payments.filter((p) => p.month === month);
    if (studentId) payments = payments.filter((p) => p.studentId === studentId);
    if (status) payments = payments.filter((p) => p.status === status);

    res.json({ success: true, data: payments.map(enrich) });
  })
);

router.get(
  '/summary',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res: Response) => {
    const month = (req.query.month as string) || nowIso().slice(0, 7);
    const payments = db.payments.findMany((p) => p.month === month);
    const collected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const debt = payments.reduce((sum, p) => sum + Math.max(0, p.amountDue - p.amountPaid), 0);
    const fullyPaid = payments.filter((p) => p.status === 'paid').length;
    const withDiscount = payments.filter((p) => p.discountPercent > 0).length;
    res.json({ success: true, data: { month, collected, debt, fullyPaid, withDiscount, total: payments.length } });
  })
);

/**
 * Recalculates amountDue for every active group-membership based on attended
 * lessons + discount eligibility for the given month. Does not touch
 * amountPaid (that only changes when a payment is recorded).
 */
router.post(
  '/recalculate',
  requireRole('super_admin', 'admin'),
  validateBody(recalculateSchema),
  asyncHandler(async (req, res: Response) => {
    const { month } = req.body;
    const profiles = db.studentProfiles.findAll();
    const results: ReturnType<typeof db.payments.findById>[] = [];

    profiles.forEach((profile) => {
      profile.groupIds.forEach((groupId) => {
        const group = db.groups.findById(groupId);
        if (!group) return;
        const course = db.courses.findById(group.courseId);
        if (!course) return;

        const { amountDue, discountPercent } = computeAmountDue(profile.id, groupId, course.monthlyFee, month);

        const existing = db.payments.findOne(
          (p) => p.studentId === profile.id && p.groupId === groupId && p.month === month
        );

        if (existing) {
          const status = existing.amountPaid >= amountDue ? 'paid' : existing.amountPaid > 0 ? 'partial' : 'debt';
          results.push(db.payments.update(existing.id, { amountDue, discountPercent, status }));
        } else {
          results.push(
            db.payments.create({
              id: newId(),
              studentId: profile.id,
              groupId,
              month,
              amountDue,
              amountPaid: 0,
              discountPercent,
              status: 'debt',
              createdAt: nowIso(),
            })
          );
        }
      });
    });

    res.json({ success: true, data: results.map(enrich) });
  })
);

router.post(
  '/record',
  requireRole('super_admin', 'admin'),
  validateBody(recordPaymentSchema),
  asyncHandler(async (req, res: Response) => {
    const { studentId, groupId, month, amountPaid } = req.body;
    const existing = db.payments.findOne(
      (p) => p.studentId === studentId && p.groupId === groupId && p.month === month
    );
    if (!existing) {
      throw ApiError.notFound('To\'lov yozuvi topilmadi. Avval /recalculate ishga tushiring');
    }
    const status = amountPaid >= existing.amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'debt';
    const updated = db.payments.update(existing.id, {
      amountPaid,
      status,
      paidAt: status === 'paid' ? nowIso() : existing.paidAt,
    });
    res.json({ success: true, data: enrich(updated) });
  })
);

export default router;
