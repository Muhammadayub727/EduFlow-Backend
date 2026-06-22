import { Router, Response } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';

export const createCourseSchema = z.object({
  name: z.string().min(2, 'Kurs nomi kamida 2 belgidan iborat bo\'lishi kerak'),
  description: z.string().optional(),
  durationMonths: z.number().int().min(1).max(36),
  monthlyLessons: z.number().int().min(1).max(60).default(12),
  monthlyFee: z.number().min(0),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    const courses = db.courses.findAll().map((c) => {
      const groups = db.groups.findMany((g) => g.courseId === c.id);
      return { ...c, groupCount: groups.length };
    });
    res.json({ success: true, data: courses });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const course = db.courses.findById(req.params.id);
    if (!course) throw ApiError.notFound('Kurs topilmadi');
    const groups = db.groups.findMany((g) => g.courseId === course.id);
    res.json({ success: true, data: { ...course, groups } });
  })
);

router.post(
  '/',
  requireRole('super_admin', 'admin'),
  validateBody(createCourseSchema),
  asyncHandler(async (req, res: Response) => {
    const course = db.courses.create({ ...req.body, id: newId(), isActive: true, createdAt: nowIso() });
    res.status(201).json({ success: true, data: course });
  })
);

router.put(
  '/:id',
  requireRole('super_admin', 'admin'),
  validateBody(updateCourseSchema),
  asyncHandler(async (req, res: Response) => {
    const existing = db.courses.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Kurs topilmadi');
    const updated = db.courses.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:id',
  requireRole('super_admin'),
  asyncHandler(async (req, res: Response) => {
    const existing = db.courses.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Kurs topilmadi');
    const groups = db.groups.findMany((g) => g.courseId === req.params.id);
    if (groups.length > 0) {
      throw ApiError.badRequest('Bu kursga bog\'liq guruhlar mavjud, avval ularni o\'chiring');
    }
    db.courses.remove(req.params.id);
    res.json({ success: true, data: { success: true } });
  })
);

export default router;
