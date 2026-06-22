import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';

const scheduleSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Vaqt HH:mm formatida bo\'lishi kerak'),
});

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Guruh nomi kamida 2 belgidan iborat bo\'lishi kerak'),
  courseId: z.string().min(1, 'Kurs tanlanishi shart'),
  teacherId: z.string().min(1, 'O\'qituvchi tanlanishi shart'),
  startDate: z.string().min(8, 'Boshlanish sanasi shart'),
  schedule: z.array(scheduleSlotSchema).min(1, 'Kamida bitta dars kuni tanlanishi shart'),
});

export const updateGroupSchema = createGroupSchema.partial().extend({
  isActive: z.boolean().optional(),
});

function enrich(group: ReturnType<typeof db.groups.findById>) {
  if (!group) return null;
  const course = db.courses.findById(group.courseId);
  const teacher = db.users.findById(group.teacherId);
  const students = group.studentIds
    .map((sid) => db.users.findById(sid))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, firstName: u!.firstName, lastName: u!.lastName }));

  return {
    ...group,
    course: course ? { id: course.id, name: course.name, monthlyFee: course.monthlyFee, durationMonths: course.durationMonths } : null,
    teacher: teacher ? { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName } : null,
    studentCount: group.studentIds.length,
    students,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let groups = db.groups.findAll();
    // teachers only see their own groups by default
    if (req.user!.activeRole === 'teacher') {
      groups = groups.filter((g) => g.teacherId === req.user!.userId);
    }
    if (req.user!.activeRole === 'student') {
      const profile = db.studentProfiles.findById(req.user!.userId);
      groups = groups.filter((g) => profile?.groupIds.includes(g.id));
    }
    const { courseId, teacherId, search } = req.query as Record<string, string | undefined>;
    if (courseId) groups = groups.filter((g) => g.courseId === courseId);
    if (teacherId) groups = groups.filter((g) => g.teacherId === teacherId);
    if (search) groups = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

    res.json({ success: true, data: groups.map(enrich) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const group = db.groups.findById(req.params.id);
    if (!group) throw ApiError.notFound('Guruh topilmadi');
    res.json({ success: true, data: enrich(group) });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin'),
  validateBody(createGroupSchema),
  asyncHandler(async (req, res: Response) => {
    const course = db.courses.findById(req.body.courseId);
    if (!course) throw ApiError.badRequest('Tanlangan kurs topilmadi');
    const teacher = db.users.findById(req.body.teacherId);
    if (!teacher || !teacher.roles.includes('teacher')) {
      throw ApiError.badRequest('Tanlangan o\'qituvchi topilmadi');
    }

    const group = db.groups.create({
      ...req.body,
      id: newId(),
      studentIds: [],
      isActive: true,
      createdAt: nowIso(),
    });

    const teacherProfile = db.teacherProfiles.findById(teacher.id);
    if (teacherProfile) {
      db.teacherProfiles.update(teacher.id, { groupIds: [...teacherProfile.groupIds, group.id] });
    }

    res.status(201).json({ success: true, data: enrich(group) });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin'),
  validateBody(updateGroupSchema),
  asyncHandler(async (req, res: Response) => {
    const existing = db.groups.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Guruh topilmadi');

    if (req.body.teacherId && req.body.teacherId !== existing.teacherId) {
      const oldTeacherProfile = db.teacherProfiles.findById(existing.teacherId);
      if (oldTeacherProfile) {
        db.teacherProfiles.update(existing.teacherId, {
          groupIds: oldTeacherProfile.groupIds.filter((id) => id !== existing.id),
        });
      }
      const newTeacherProfile = db.teacherProfiles.findById(req.body.teacherId);
      if (newTeacherProfile) {
        db.teacherProfiles.update(req.body.teacherId, {
          groupIds: [...newTeacherProfile.groupIds, existing.id],
        });
      }
    }

    const updated = db.groups.update(req.params.id, req.body);
    res.json({ success: true, data: enrich(updated) });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res: Response) => {
    const existing = db.groups.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Guruh topilmadi');
    if (existing.studentIds.length > 0) {
      throw ApiError.badRequest('Bu guruhda talabalar mavjud, avval ularni boshqa guruhga o\'tkazing');
    }
    const teacherProfile = db.teacherProfiles.findById(existing.teacherId);
    if (teacherProfile) {
      db.teacherProfiles.update(existing.teacherId, {
        groupIds: teacherProfile.groupIds.filter((id) => id !== existing.id),
      });
    }
    db.groups.remove(req.params.id);
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
