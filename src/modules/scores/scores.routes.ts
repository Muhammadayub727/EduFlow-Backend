import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';

export const createScoreSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().min(1),
  date: z.string().min(8),
  score: z.number().int().min(1, 'Baho 1 dan kichik bo\'lishi mumkin emas').max(10, 'Baho 10 dan katta bo\'lishi mumkin emas'),
  comment: z.string().optional(),
});

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId, studentId } = req.query as Record<string, string | undefined>;
    let scores = db.scores.findAll();

    if (req.user!.activeRole === 'teacher') {
      const profile = db.teacherProfiles.findById(req.user!.userId);
      scores = scores.filter((s) => profile?.groupIds.includes(s.groupId));
    }
    if (req.user!.activeRole === 'student') {
      scores = scores.filter((s) => s.studentId === req.user!.userId);
    }
    if (groupId) scores = scores.filter((s) => s.groupId === groupId);
    if (studentId) scores = scores.filter((s) => s.studentId === studentId);

    res.json({ success: true, data: scores });
  })
);

router.get(
  '/analytics/:studentId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.activeRole === 'student' && req.user!.userId !== req.params.studentId) {
      throw ApiError.forbidden('Faqat o\'z baholaringizni ko\'rishingiz mumkin');
    }
    const scores = db.scores.findMany((s) => s.studentId === req.params.studentId);
    const average = scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
    const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date));
    res.json({
      success: true,
      data: { average: Math.round(average * 10) / 10, count: scores.length, history: sorted },
    });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(createScoreSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = db.groups.findById(req.body.groupId);
    if (!group) throw ApiError.notFound('Guruh topilmadi');
    if (req.user!.activeRole === 'teacher' && group.teacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu guruh sizga tegishli emas');
    }
    if (!group.studentIds.includes(req.body.studentId)) {
      throw ApiError.badRequest('Bu talaba bu guruhga tegishli emas');
    }

    const score = db.scores.create({
      ...req.body,
      id: newId(),
      gradedByTeacherId: req.user!.userId,
      createdAt: nowIso(),
    });
    res.status(201).json({ success: true, data: score });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin', 'teacher'),
  validateBody(createScoreSchema.partial()),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.scores.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Baho topilmadi');
    if (req.user!.activeRole === 'teacher' && existing.gradedByTeacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu bahoni faqat siz qo\'ygan bo\'lsangiz tahrirlay olasiz');
    }
    const updated = db.scores.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin', 'admin', 'teacher'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const existing = db.scores.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Baho topilmadi');
    if (req.user!.activeRole === 'teacher' && existing.gradedByTeacherId !== req.user!.userId) {
      throw ApiError.forbidden('Bu bahoni faqat siz qo\'ygan bo\'lsangiz o\'chira olasiz');
    }
    db.scores.remove(req.params.id);
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
