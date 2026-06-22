import { Router, Response } from 'express';
import { db, nowIso } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('super_admin', 'admin'));

router.get(
  '/overview',
  asyncHandler(async (req, res: Response) => {
    const month = (req.query.month as string) || nowIso().slice(0, 7);

    const students = db.studentProfiles.findAll();
    const activeStudents = students.filter((s) => db.users.findById(s.id)?.isActive).length;
    const groups = db.groups.findMany((g) => g.isActive);

    const payments = db.payments.findMany((p) => p.month === month);
    const income = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const debt = payments.reduce((sum, p) => sum + Math.max(0, p.amountDue - p.amountPaid), 0);

    const salaries = db.salaries.findMany((s) => s.month === month);
    const salaryTotal = salaries.reduce((sum, s) => sum + s.salaryAmount, 0);

    const attendanceRecords = db.attendance.findMany((a) => a.date.startsWith(month));
    const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
    const attendanceRate = attendanceRecords.length
      ? Math.round((presentCount / attendanceRecords.length) * 1000) / 10
      : 0;

    const courses = db.courses.findAll();
    const coursePopularity = courses.map((c) => {
      const groupIds = db.groups.findMany((g) => g.courseId === c.id).map((g) => g.id);
      const studentCount = students.filter((s) => s.groupIds.some((gid) => groupIds.includes(gid))).length;
      return { courseId: c.id, courseName: c.name, studentCount };
    });

    const paymentCompletion = {
      paid: payments.filter((p) => p.status === 'paid').length,
      partial: payments.filter((p) => p.status === 'partial').length,
      debt: payments.filter((p) => p.status === 'debt').length,
    };

    res.json({
      success: true,
      data: {
        month,
        totalStudents: students.length,
        activeStudents,
        totalGroups: groups.length,
        income,
        debt,
        profit: income - salaryTotal,
        salaryTotal,
        attendanceRate,
        coursePopularity,
        paymentCompletion,
      },
    });
  })
);

router.get(
  '/income-trend',
  asyncHandler(async (req, res: Response) => {
    const months = parseInt((req.query.months as string) || '6', 10);
    const now = new Date();
    const result: Array<{ month: string; income: number; salary: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const payments = db.payments.findMany((p) => p.month === monthKey);
      const salaries = db.salaries.findMany((s) => s.month === monthKey);
      result.push({
        month: monthKey,
        income: payments.reduce((sum, p) => sum + p.amountPaid, 0),
        salary: salaries.reduce((sum, s) => sum + s.salaryAmount, 0),
      });
    }

    res.json({ success: true, data: result });
  })
);

export default router;
