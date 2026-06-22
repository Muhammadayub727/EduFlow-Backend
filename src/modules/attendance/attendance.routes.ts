import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';

const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['present', 'absent', 'excused']),
  reason: z.string().optional(),
});

export const markAttendanceSchema = z.object({
  groupId: z.string().min(1, 'Guruh tanlanishi shart'),
  date: z.string().min(8, 'Sana shart'),
  entries: z.array(attendanceEntrySchema).min(1, 'Kamida bitta talaba uchun davomat belgilanishi kerak'),
});

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId, date, studentId } = req.query as Record<string, string | undefined>;
    let records = db.attendance.findAll();

    if (req.user!.activeRole === 'teacher') {
      const teacherProfile = db.teacherProfiles.findById(req.user!.userId);
      records = records.filter((r) => teacherProfile?.groupIds.includes(r.groupId));
    }
    if (req.user!.activeRole === 'student') {
      records = records.filter((r) => r.studentId === req.user!.userId);
    }
    if (groupId) records = records.filter((r) => r.groupId === groupId);
    if (date) records = records.filter((r) => r.date === date);
    if (studentId) records = records.filter((r) => r.studentId === studentId);

    res.json({ success: true, data: records });
  })
);

router.post(
  '/mark',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(markAttendanceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = db.groups.findById(req.body.groupId);
    if (!group) throw ApiError.notFound('Guruh topilmadi');

    if (req.user!.activeRole === 'teacher' && group.teacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu guruh sizga tegishli emas');
    }

    const created = req.body.entries.map((entry: { studentId: string; status: string; reason?: string }) => {
      // remove any existing record for same student/group/date to avoid duplicates
      const existing = db.attendance.findOne(
        (r) => r.groupId === req.body.groupId && r.studentId === entry.studentId && r.date === req.body.date
      );
      if (existing) db.attendance.remove(existing.id);

      return db.attendance.create({
        id: newId(),
        groupId: req.body.groupId,
        studentId: entry.studentId,
        date: req.body.date,
        status: entry.status as 'present' | 'absent' | 'excused',
        reason: entry.reason,
        markedByTeacherId: req.user!.userId,
        createdAt: nowIso(),
      });
    });

    res.status(201).json({ success: true, data: created });
  })
);

router.get(
  '/summary/:groupId/:date',
  asyncHandler(async (req, res: Response) => {
    const records = db.attendance.findMany(
      (r) => r.groupId === req.params.groupId && r.date === req.params.date
    );
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    res.json({ success: true, data: { present, absent, excused, total: records.length } });
  })
);

export default router;
