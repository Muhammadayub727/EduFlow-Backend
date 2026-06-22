import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';

export const createHomeworkSchema = z.object({
  groupId: z.string().min(1, 'Guruh tanlanishi shart'),
  title: z.string().min(2, 'Sarlavha kamida 2 belgidan iborat bo\'lishi kerak'),
  description: z.string().min(2, 'Tavsif kiritilishi shart'),
  deadline: z.string().min(8, 'Muddat kiritilishi shart'),
  attachmentUrl: z.string().url().optional(),
});

export const updateHomeworkSchema = createHomeworkSchema.partial();

function enrich(hw: ReturnType<typeof db.homework.findById>) {
  if (!hw) return null;
  const group = db.groups.findById(hw.groupId);
  return { ...hw, groupName: group?.name ?? null };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let items = db.homework.findAll();
    const { groupId } = req.query as Record<string, string | undefined>;

    if (req.user!.activeRole === 'teacher') {
      const profile = db.teacherProfiles.findById(req.user!.userId);
      items = items.filter((h) => profile?.groupIds.includes(h.groupId));
    }
    if (req.user!.activeRole === 'student') {
      const profile = db.studentProfiles.findById(req.user!.userId);
      items = items.filter((h) => profile?.groupIds.includes(h.groupId));
    }
    if (groupId) items = items.filter((h) => h.groupId === groupId);

    res.json({ success: true, data: items.map(enrich) });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(createHomeworkSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = db.groups.findById(req.body.groupId);
    if (!group) throw ApiError.notFound('Guruh topilmadi');
    if (req.user!.activeRole === 'teacher' && group.teacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu guruh sizga tegishli emas');
    }

    const homework = db.homework.create({
      ...req.body,
      id: newId(),
      createdByTeacherId: req.user!.userId,
      createdAt: nowIso(),
    });
    res.status(201).json({ success: true, data: enrich(homework) });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(updateHomeworkSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.homework.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Topshiriq topilmadi');
    if (req.user!.activeRole === 'teacher' && existing.createdByTeacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu topshiriq sizga tegishli emas');
    }
    const updated = db.homework.update(req.params.id, req.body);
    res.json({ success: true, data: enrich(updated) });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin', 'admin', 'teacher'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.homework.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Topshiriq topilmadi');
    if (req.user!.activeRole === 'teacher' && existing.createdByTeacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu topshiriq sizga tegishli emas');
    }
    db.homework.remove(req.params.id);
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
